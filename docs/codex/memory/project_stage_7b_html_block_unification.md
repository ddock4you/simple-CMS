<!--
Codex migration note: this file is a Codex-friendly instruction/reference file.
Codex automatically reads AGENTS.md files by directory scope.
-->
---
name: Stage 7b — HTML 블록 통합 모델 (Option B)
description: 페이지 단위 customHtml/customCss는 폐기됨. HTML 블록이 { html, css? }로 흡수. 향후 페이지 단위 도입 제안 회귀 방지
type: project
originSessionId: e63891e1-8caa-4988-af79-12db7e4ea709
---
Stage 7b 작업 중 페이지 단위 `Subpage.customHtml`/`customCss` 필드를 시도했다가 **HTML 블록과 역할 중복**이 드러나 Option B로 통합 결정.

**Why:** 첫 시도(2026-04-16 오전)에서 페이지 단위 customHtml/customCss 필드 + 별도 SubpageCustomCodeForm을 만들었는데, 이미 존재하던 `BlockType.HTML`(Stage 6)과 다음이 겹쳤다 — (1) 자유 HTML 입력 (2) DOMPurify sanitize (3) admin Monaco 편집 UI. 운영자 입장에서 "HTML을 어디에 입력해야 하지?" 결정 부담. 사용자가 같은 날 오후 "두 기능을 통합하자"로 방향 전환.

**최종 채택 (Option B, 2026-04-16):**
- `Subpage.customHtml`/`customCss` 필드는 schema에서 drop, 데이터 폐기 (사용자 결정 명시)
- HTML 블록의 `configJson`을 `{ html: string, css?: string | null }`로 확장
- CSS 스코프는 **페이지 단위** — 같은 페이지의 모든 HTML 블록 css가 `#subpage-{subpage.id}` prefix 공유 → 한 블록의 css가 페이지 전체에 영향(다른 RICH_TEXT 블록 등 포함). 운영자가 "이 페이지의 h2 빨강"을 한 블록에서 처리 가능
- `apps/web/src/shared/lib/scopeCustomCss.ts`와 `sanitizeCustomHtml`(`renderContent.ts`)는 유지 — HTML 블록의 web 렌더 단계에서 재사용
- `SubpageBlockRenderer`는 `subpageId` prop을 받아 HtmlBlock에 전달, page 컴포넌트가 `<article id="subpage-{id}">` 루트 부여

**How to apply:**
- 향후 누군가 "페이지 단위 customHtml/customCss 필드 다시 도입" 또는 "페이지 전역 스타일을 위한 별도 영역" 제안이 나오면 **이 결정을 먼저 상기**시킬 것. HTML 블록으로 처리 가능하다는 답이 우선
- HTML 블록의 css는 페이지 스코프라 같은 페이지 다른 블록에도 영향 — 블록 격리가 필요하면 별도 결정 필요(현재는 의도적 단순화)
- 알려진 한계: `scopeCustomCss`의 정규식 파서가 `:is()`/`:where()`/`:has()`/`@container`/CSS nesting 완전 지원 불가. Stage 8+에서 `postcss-prefix-selector` 도입 검토
- HTML 블록 추가 시 `defaultConfigByType.HTML`은 `{ html: '', css: null }` (css는 빈 문자열이 아닌 null로 시작)
