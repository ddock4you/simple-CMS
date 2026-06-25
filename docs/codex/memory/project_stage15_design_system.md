<!--
Codex migration note: this file is a Codex-friendly instruction/reference file.
Codex automatically reads AGENTS.md files by directory scope.
-->
---
name: Stage 15 — design.md 기반 디자인 시스템
description: 디자이너 부재로 design.md가 admin 시각 결정의 단일 진실원이 됨. 15a~15c-3b 완료, 15c-3c+ 예정
type: project
originSessionId: 13f96d7c-b019-47bf-af8b-2fc3f445e6ac
---
admin 디자이너가 없으므로 `apps/admin/design.md`를 시각 결정의 단일 진실원으로 격상.

**완료 (2026-05-07):**
- 15a: design.md 전면 재작성 (Stitch YAML + 한글 8섹션)
- 15b: globals.css에 shadow 토큰 추가 (`--shadow-card/popover`, light/dark 페어). 이후 정책 변경으로 PageToolbar/DialogToolbar는 shadow 없이 `border-b` 하단 경계 사용
- 15c-1: shadow 토큰 실 컴포넌트 적용 (PageToolbar / BlockContentView / TiptapEditor 팝업 3곳)
- 15c-2: shadow wrapper 4개(Popover/Select/DropdownMenu/Sheet) + 27파일 swap + BooleanSwitchField + 5폼 통일
- 15c-3a: verify-design-tokens.mjs 신설 + success/warning 시맨틱 토큰 + design.md YAML 22토큰 보정
- 15c-3b: Badge wrapper(success/warning) + 14곳 raw color swap + chartColors helper + 2개 차트 적용

**15c-3a 핵심 내용:**
- `apps/admin/scripts/verify-design-tokens.mjs`: `:root` oklch ↔ design.md hex ΔE2000 검증, 임계 1.5
- 실행: `pnpm --filter @simple-cms/admin design:verify`
- success 토큰: `oklch(0.52 0.17 145)` = #00801a (WCAG AA 4.9:1). warning은 out-of-gamut 이슈로 `oklch(0.748 0.162 70)` = #ed9800
- design.md YAML 9개 토큰 hex가 stale (ΔE 3~10)이었음 — 모두 oklch→hex 변환값으로 수정
- 부록 B: 토큰 외 색 허용 예외 표 (global-error / stories / TiptapEditor color picker)

**15c-3b 핵심 내용:**
- `apps/admin/src/shared/ui/Badge.tsx`: success/warning variant wrapper. shadcn 원본 직접 수정 금지
  - ESLint 가드는 이번 PR 보류. 신규 사용처에만 자연 채택
- `apps/admin/src/shared/lib/chartColors.ts`: `getChartColors()` — mount 시점에 CSS 토큰 읽어 Recharts에 전달
- raw color 14곳 swap: AuditLogDetailDialog / SlugField 3개 / DomainSettingsForm / FeedbackBySubpageTable / RatingBadge / BlockDiffSummary / RecentVersionsCard / VersionHistoryDialog / VersionDetailDialog

**예정 — Stage 15c-3c:**
AlertDialog wrapper(size 4단) + ESLint 가드 + PageHeader 2곳(ProfilePage/NavigationEditClient) 정정

**HARD RULES (절대 위반 금지):**
- `npx @google/design.md export css-tailwind` 실행 금지 (globals.css oklch 파괴)
- 신규 brand color 신설 금지 (디자이너 합류 전)
- shadcn 표준 토큰명 변경 금지 (`--primary`, `--ring` 등 28개 의존)
- 신규 토큰 추가 시 globals.css `:root` + `.dark` 페어 필수

**문서 분담 (확정):**
- `apps/admin/design.md` = 시각 결정 (색·타이포·간격·primitives) + Stitch lint 가능
- `apps/admin/AGENTS.md` = 운영 정책·아키텍처
- `apps/admin/.storybook/` = 실물 컴포넌트 검증
