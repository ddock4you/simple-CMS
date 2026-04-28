# Stage 11d — 접근성 정밀 점검 (WCAG AA)

## 작업 범위

### 1. HeaderBranding aria 보강

**파일**: `apps/web/src/widgets/layout/ui/HeaderBranding.tsx`

**변경 내용**:
- 로고 `<Link href="/">` 에 `aria-label={branding.logoAlt}` 추가
  - 기존: `<img alt="">` + `<span className="sr-only">{branding.logoAlt}</span>` 조합으로 접근성 이름 제공
  - 변경: `aria-label`을 Link에 직접 부여 — sr-only 스팬 제거, 더 명시적이고 간결
  - `brandingCache`가 `logoAlt || siteName` 폴백을 보장하므로 aria-label은 항상 비어있지 않음
- 검색 SVG에 `aria-hidden="true"` 추가
  - Link에 `aria-label="검색"` 이 이미 있어 SVG 내용이 스크린 리더에 불필요하게 노출될 수 있음
  - `aria-hidden`으로 SVG를 보조기술에서 제외

### 2. axe-core WCAG AA E2E 자동 검사

**파일**: `e2e/web/accessibility.spec.ts` (신규)

```ts
import AxeBuilder from '@axe-core/playwright';

test.describe('공개 웹 접근성 (axe-core WCAG AA)', () => {
  test('메인 페이지 axe 검사', async ({ page }) => { ... });
  test('검색 페이지 axe 검사', async ({ page }) => { ... });
});
```

- `withTags(['wcag2a', 'wcag2aa'])` — WCAG 2.0 Level AA 기준 검사
- `results.violations` 배열이 비어있으면 통과
- web E2E project에 자동 포함 (testMatch: `**/web/**/*.spec.ts`)

## 의존성

```json
"devDependencies": {
  "@axe-core/playwright": "^4.11.2"
}
```

## 실행 방법

```bash
# 서버 실행 선행 필요
pnpm e2e --project=web  # web E2E 프로젝트만 실행
pnpm e2e:ui             # UI 모드로 개별 시각 확인
```

## axe 검사 결과 해석

`results.violations` 배열 형태:
```json
[
  {
    "id": "color-contrast",
    "impact": "serious",
    "description": "Ensures the contrast between foreground and background colors...",
    "nodes": [{ "html": "...", "failureSummary": "..." }]
  }
]
```

violation이 있으면 `expect(results.violations).toEqual([])` 실패 — Playwright 리포트에 전체 위반 목록이 JSON으로 표시됨.

## 기존 접근성 패턴 (변경 없음)

| 컴포넌트 | 적용된 접근성 패턴 |
|---------|-----------------|
| SubpageSideNavigation | `aria-current="page"` 현재 페이지 표시 |
| RightSidebar | `aria-current="page"` 활성 항목 |
| SubpageFeedbackForm | `aria-live="polite"` 제출 후 감사 메시지 |
| HomePopupModal | `role="dialog"` + `aria-modal` + `aria-labelledby` + 포커스 트랩 |
| Carousel | Swiper A11y 모듈 + `aria-roledescription="carousel"` |
| KoglFooter | 이미지형 공공누리 마크 alt 텍스트 |
| 검색 링크 | `aria-label="검색"` (SVG 아이콘 링크) |

## CI 통합 비고

axe E2E는 PGroonga Docker 환경이 필요하므로 CI 자동화는 Stage 8 이후 추가.
Stage 8 CI workflow에서 `pnpm e2e --project=web` 통합 예정.
