# Stage 15c-3d — Card baseline 보정

## 범위

design.md §7 spec(`{components.card}`: `{rounded.lg}` + 24px padding, `{typography.section-title}`: `text-lg font-semibold`)과 실 구현 간 괴리를 수정. admin 전반의 anchor surface인 Card를 SSOT와 일치시킨다.

**wrapper 미도입 결정**: Card는 이미 `size?: "default" | "sm"` prop을 보유하고, 0개 호출처가 padding/rounded를 override 중. ESLint 가드도 불필요. shadcn 직접 수정이 적합.

## 변경 파일

| 파일 | 변경 내용 |
|---|---|
| `apps/admin/src/shared/ui/shadcn/card.tsx` | Card/CardHeader/CardContent/CardFooter/CardTitle/CardDescription baseline 보정 |
| `apps/admin/src/features/subpage-feedback/ui/FeedbackTimelineChart.tsx` | CardTitle `className="text-base"` 제거 |
| `apps/admin/src/features/subpage-feedback/ui/FeedbackPositiveReasonsChart.tsx` | CardTitle `className="text-base"` 제거 |
| `apps/admin/src/features/subpage-feedback/ui/FeedbackBySubpageTable.tsx` | CardTitle `className="text-base"` 제거 |
| `apps/admin/src/features/subpage-version/ui/RecentVersionsCard.tsx` | CardTitle `className="... text-base"` 에서 `text-base` 제거 |
| `apps/admin/design.md` | §7 Card + Field 패턴에 StatCard 예외 1줄 추가 |
| `AGENTS.md` (루트) | Stage 15c-3d 행 추가 |
| `docs/stages/stage-15c-3d.md` | 이 파일 (신규) |

## 변경 상세

### `card.tsx` 슬롯별 변경

| 슬롯 | 변경 전 | 변경 후 | 근거 |
|---|---|---|---|
| Card | `gap-4 rounded-xl py-4` | `gap-6 rounded-lg py-6` | `{rounded.lg}` + 24px spacing |
| Card (sm) | `data-[size=sm]:gap-3 py-3` | `data-[size=sm]:gap-4 py-4` | 16px 비례 |
| Card img 코너 | `rounded-t-xl / rounded-b-xl` | `rounded-t-lg / rounded-b-lg` | `{rounded.lg}` 일관 |
| CardHeader | `rounded-t-xl px-4 / px-3(sm)` | `rounded-t-lg px-6 / px-4(sm)` | 24px horizontal |
| CardHeader border-b | `pb-4 / pb-3(sm)` | `pb-6 / pb-4(sm)` | 24px |
| CardContent | `px-4 / px-3(sm)` | `px-6 / px-4(sm)` | 24px horizontal |
| CardFooter | `rounded-b-xl p-4 / p-3(sm)` | `rounded-b-lg p-6 / p-4(sm)` | `{rounded.lg}` + 24px |
| CardTitle | `text-base font-medium` | `text-lg font-semibold` | `{typography.section-title}` |
| CardTitle (sm) | `text-sm` | `text-base` | 1단계 축소 |
| CardDescription | `text-sm` | `text-xs` | `{typography.caption}` |

### override 처리

| 파일 | override | 처리 |
|---|---|---|
| `LoginForm.tsx` / `RegisterForm.tsx` | `text-xl` | 유지 — design.md §7 Auth 예외 |
| `StatCard.tsx` | `text-sm font-medium` | 유지 — design.md §7에 deviation 추가 |
| Feedback 3 charts + RecentVersionsCard | `text-base` | 제거 — 신규 spec `text-lg`로 자연 통일 |

## 검증 결과

```
pnpm --filter @simple-cms/admin typecheck  → 통과 (오류 0)
pnpm --filter @simple-cms/admin lint       → 통과 (기존 warning 9건, 신규 0건)
pnpm --filter @simple-cms/admin build      → 통과
```

## 시각 검토 대상

Card는 admin 전 페이지에 등장하므로 1주 visual review 권장.

| 영역 | 확인 사항 |
|---|---|
| `/dashboard` | StatCard(예외 유지) + ErrorLog widget 카드 |
| `/login`, `/register` | Auth 카드(text-xl 예외 유지) |
| `/subpages`, `/posts`, `/users` | 목록 테이블 Card wrapper |
| `/subpages/[id]` | BlockContentView shadow-card 적용 카드 |
| `/subpages/[id]/edit` | SubpageForm 폼 Card (padding 확인) |
| `/subpage-feedback` | Timeline/Reasons 차트 CardTitle (text-base 제거 후 text-lg) |
| `/subpages/[id]` 버전 이력 | RecentVersionsCard (text-base 제거 후 text-lg) |

## 후속 PR

| Stage | 내용 |
|---|---|
| **15c-3e** | AlertDialog size 토큰 설계 (confirm/default/wide 3-tier) + 24 호출처 className → size prop |
