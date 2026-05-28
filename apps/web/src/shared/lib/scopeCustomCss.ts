/**
 * 사용자 입력 CSS를 서브페이지 단위로 스코프 고립시킨다.
 *
 * 동작 규칙:
 * 1. 빈 입력 → 빈 문자열
 * 2. `@keyframes`, `@font-face`, `@page`, `@property`, `@counter-style` 블록은
 *    내부가 descriptor/keyword(`from`, `to`, `N%`)라 prefix 대상이 아니므로 보존
 * 3. `@import`, `@charset`, `@namespace` 등 세미콜론으로 끝나는 AT 규칙은 보존
 * 4. `html`, `body`, `:root` 키워드는 `#subpage-{id}`로 치환 → 전역 문서 오염 방지
 * 5. 나머지 모든 셀렉터(개별 rule 블록 + `@media` / `@supports` / `@container` /
 *    `@layer` 내부 포함)는 `#subpage-{id} `를 prepend
 *
 * 알려진 한계:
 * - `:is()` / `:where()` / `:has()` 내부의 복합 셀렉터는 prefix가 함수 **바깥**에
 *   한 번만 붙음 → 실 브라우저 렌더는 대부분 의도대로 동작하지만 엄밀하지 않음
 * - CSS nesting(`.a { .b { ... } }`) 미지원 — 최상위 브레이스만 처리
 * - 복잡 케이스가 필요하면 `postcss-prefix-selector` 도입 검토 (Stage 8+)
 */
export function scopeCustomCss(css: string, subpageId: string): string {
  if (!css) return '';
  const scope = `#subpage-${subpageId}`;
  const normalizedCss = css.replace(/\r\n?/g, '\n');

  // Step 1: descriptor/keyword 내부 AT 규칙을 placeholder로 치환
  const excludedBlocks: string[] = [];
  const excludeBlockPattern =
    /@(?:keyframes|-webkit-keyframes|-moz-keyframes|-o-keyframes|font-face|counter-style|font-feature-values|page|viewport|property)\b[^{]*\{(?:[^{}]|\{[^{}]*\})*\}/gi;
  let processed = normalizedCss.replace(excludeBlockPattern, (match) => {
    const index = excludedBlocks.length;
    excludedBlocks.push(match);
    return `__SCOPE_EX_BLOCK_${index}__`;
  });

  // Step 2: 세미콜론 종결형 AT 규칙 placeholder (@import, @charset, @namespace)
  // 플레이스홀더를 '@'로 시작하면 Step 4 셀렉터 정규식([^{};@\s])이 건너뜀 → 다음 줄 셀렉터가 분리됨
  const excludedStatements: string[] = [];
  const excludeStatementPattern = /@(?:import|charset|namespace)\b[^;]*;/gi;
  processed = processed.replace(excludeStatementPattern, (match) => {
    const index = excludedStatements.length;
    excludedStatements.push(match);
    return `@__SCOPE_STMT_${index}__`;
  });

  // Step 3: html / body / :root → scope 치환
  processed = processed.replace(/\b(html|body)\b/g, scope);
  processed = processed.replace(/:root\b/g, scope);

  // Step 4: 셀렉터 리스트 prefix 주입
  // 매칭: (시작/구분자) + (@로 시작하지 않는 셀렉터 문자열) + {
  // @media / @supports / @container / @layer 자체 조건부(예: `(max-width: 768px)`)는
  // '('로 시작하는 rawSelectors를 감지하여 그대로 통과시킴 — CSS 셀렉터는 '('로 시작하지 않음
  processed = processed.replace(
    /(^|[{};\s])([^{};@\s][^{};]*)\{/g,
    (_match, prefix: string, rawSelectors: string) => {
      // @media/@supports 조건 `(max-width: 768px)` 등은 prefix 금지
      if (rawSelectors.trim().startsWith('(')) {
        return _match;
      }
      const scoped = rawSelectors
        .split(',')
        .map((s) => {
          const trimmed = s.trim();
          if (!trimmed) return '';
          // 이미 scope로 시작하면 중복 방지 (html/body/:root가 치환된 경우 포함)
          if (
            trimmed === scope ||
            trimmed.startsWith(`${scope} `) ||
            trimmed.startsWith(`${scope}:`)
          ) {
            return trimmed;
          }
          return `${scope} ${trimmed}`;
        })
        .filter(Boolean)
        .join(', ');
      return `${prefix}${scoped} {`;
    },
  );

  // Step 5: placeholder 복원
  processed = processed.replace(/@__SCOPE_STMT_(\d+)__/g, (_m, i) => {
    const idx = Number(i);
    return excludedStatements[idx] ?? '';
  });
  processed = processed.replace(/__SCOPE_EX_BLOCK_(\d+)__/g, (_m, i) => {
    const idx = Number(i);
    return excludedBlocks[idx] ?? '';
  });

  return processed;
}
