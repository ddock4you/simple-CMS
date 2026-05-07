# Stage 15c-3a — SSOT 검증 인프라 + success/warning 시맨틱 토큰

## 범위

design.md를 admin 시각 결정의 단일 진실원(SSOT)으로 격상하기 위한 첫 번째 단계. 검증 인프라를 만들고, 기존 YAML hex 값의 drift를 수정하고, success/warning 시맨틱 토큰을 신설했다.

## 변경 파일

| 파일 | 변경 내용 |
|---|---|
| `apps/admin/scripts/verify-design-tokens.mjs` | **신규** — oklch↔hex ΔE2000 검증 스크립트 |
| `apps/admin/app/globals.css` | success/warning 토큰 신설 (`:root` + `.dark` + `@theme inline`) |
| `apps/admin/design.md` | YAML colors 22토큰 정합 + 프로즈 전체 업데이트 + 부록B |
| `apps/admin/CLAUDE.md` | success/warning + design:verify 안내 추가 |
| `CLAUDE.md` (루트) | Stage 15c-3a 행 추가 |

## A1 — verify-design-tokens.mjs

`apps/admin/scripts/verify-design-tokens.mjs`:

- globals.css `:root` 블록에서 `--token: oklch(L C H);` 패턴을 파싱
- design.md YAML frontmatter `colors` 객체에서 hex 값을 파싱
- 토큰별 culori `differenceCiede2000()` 로 ΔE2000 계산
- **임계: ΔE ≤ 1.5** — 실패 시 exit 1 + 토큰별 표 출력
- `--verbose`/`-v` 플래그로 전체 토큰 표 확인 가능

```bash
pnpm --filter @simple-cms/admin design:verify          # 결과 요약만
pnpm --filter @simple-cms/admin design:verify --verbose # 전체 표
```

### 발견된 drift (9개 기존 토큰 수정)

| 토큰 | 기존 hex | 수정 hex | ΔE |
|---|---|---|---|
| foreground | #252525 | #0a0a0a | 10.2 |
| primary | #343434 | #171717 | 6.1 |
| secondary-foreground | #343434 | #171717 | 6.1 |
| accent-foreground | #343434 | #171717 | 6.1 |
| muted-foreground | #8e8e8e | #737373 | 5.3 |
| destructive | #dc2626 | #e7000b | 3.6 |
| ring | #b5b5b5 | #a1a1a1 | 3.8 |
| card-foreground | #252525 | #0a0a0a | 10.2 |
| popover-foreground | #252525 | #0a0a0a | 10.2 |

### 주의: out-of-gamut 색 수정

`oklch(0.745 0.18 75)` (원래 계획한 warning 값)은 sRGB blue 채널이 -0.22로 심하게 out-of-gamut. culori가 hex로 표현할 때는 `#ed9800`으로 클리핑하지만, ΔE 계산 시 원본 oklch 값을 사용하여 ΔE=6.08 실패. `oklch(0.748 0.162 70)` (in-gamut, `#ed9800`과 ΔE=0.064)으로 수정.

## A2 — success/warning 시맨틱 토큰

### globals.css 추가

```css
/* :root */
--success: oklch(0.52 0.17 145);          /* #00801a */
--success-foreground: oklch(0.985 0 0);   /* #fafafa */
--warning: oklch(0.748 0.162 70);         /* #ed9800 */
--warning-foreground: oklch(0.205 0 0);   /* #171717 */

/* .dark */
--success: oklch(0.7 0.155 145);          /* #57b75e */
--success-foreground: oklch(0.145 0 0);   /* #0a0a0a */
--warning: oklch(0.82 0.16 75);           /* #ffb330 */
--warning-foreground: oklch(0.145 0 0);   /* #0a0a0a */
```

### WCAG AA 대비율 (light mode)

| 조합 | 대비율 | 결과 |
|---|---|---|
| success-foreground on success | ~4.9:1 | ✅ AA |
| warning-foreground on warning | ~7.8:1 | ✅ AAA |
| text-success on white | ~5.1:1 | ✅ AA |
| text-warning on white | ~2.3:1 | ✗ — 배경 색·foreground 전용 |

### 변경된 WCAG 수치 (hex 보정 영향)

| 조합 | 이전 | 이후 |
|---|---|---|
| foreground on background | ~11.9:1 | ~19.8:1 |
| primary-foreground on primary | ~11.4:1 | ~17.2:1 |
| destructive on background | ~5.7:1 | ~4.8:1 |
| secondary-foreground on secondary | ~11.0:1 | ~16.4:1 |
| muted-foreground on background | ~3.5:1 ⚠️ 미달 | ~4.8:1 ✅ AA |

**muted-foreground는 AA를 통과하게 됐지만** 필수 정보 라벨에는 여전히 사용 금지 (설계 의도 유지).

## A3 — design.md 문서 업데이트

- YAML frontmatter `colors`: 22토큰 (기존 18 + success/success-foreground/warning/warning-foreground 4개 신규)
- 토큰 의미 매핑 표: success/warning 4행 추가 + 기존 hex 수정
- 다크 모드 델타 표: 전체 hex 보정 + success/warning 행 추가
- WCAG 표: 대비율 전체 재계산 + success/warning 행 추가 + muted-foreground 주석 변경
- lint 명령 섹션: `pnpm design:verify` 추가
- Section 7 Card + Field: Auth 예외 (LoginForm/RegisterForm `text-xl`) 문서화
- Section 8 Don't #2: success/warning은 functional 토큰이라 허용 명시
- 부록 B: 토큰 외 색 허용 예외 표 (global-error / stories / TiptapEditor color picker)

## 검증 결과

```
pnpm --filter @simple-cms/admin design:verify
✓ All 22 tokens pass (max ΔE: 1.29) — threshold 1.5

pnpm --filter @simple-cms/admin typecheck  → 통과 (오류 0)
pnpm --filter @simple-cms/admin lint       → 통과 (기존 warning 9건, 신규 0건)
pnpm --filter @simple-cms/admin build      → 통과 (75 routes)
```

## 후속 PR

| Stage | 내용 |
|---|---|
| **15c-3b** | Badge wrapper(success/warning) + 20곳 raw green/amber → 토큰 swap + chartColors helper |
| **15c-3c** | AlertDialog wrapper(size 4단) + ESLint 가드 + PageHeader 2곳 정정 |
| **15c-3d** | Card baseline 보정 (별도 plan, 1주 visual review 후) |
