# Stage 15c-3b — 시맨틱 색 적용 (Badge wrapper + raw color swap + chartColors)

## 범위

15c-3a에서 정의한 success/warning 시맨틱 토큰을 실 컴포넌트에 적용. 총 3가지 작업: Badge wrapper 신설, raw color 14곳 swap, Recharts chartColors helper 신설.

## 변경 파일

| 파일 | 변경 내용 |
|---|---|
| `apps/admin/src/shared/ui/Badge.tsx` | **신규** — success/warning variant wrapper |
| `apps/admin/src/shared/lib/chartColors.ts` | **신규** — Recharts 토큰 연동 helper |
| `apps/admin/src/features/audit-log/ui/AuditLogDetailDialog.tsx` | bg-red-50/green-50 + text-red-600/green-600 → destructive/success 토큰 |
| `apps/admin/src/features/board-management/ui/SlugField.tsx` | text-amber-600 → text-warning |
| `apps/admin/src/features/post-management/ui/SlugField.tsx` | text-amber-600 → text-warning |
| `apps/admin/src/features/subpage-management/ui/SlugField.tsx` | text-amber-600 → text-warning |
| `apps/admin/src/features/site-settings/ui/DomainSettingsForm.tsx` | text-green-600/amber-600 → text-success/warning |
| `apps/admin/src/features/subpage-feedback/ui/FeedbackBySubpageTable.tsx` | text-green-700/red-700 + bg-green-600 → success/destructive 토큰 |
| `apps/admin/src/features/subpage-feedback/ui/RatingBadge.tsx` | shadcn Badge → wrapper Badge (success/destructive variant) |
| `apps/admin/src/features/subpage-feedback/ui/FeedbackTimelineChart.tsx` | #16a34a/#dc2626/#6b7280/#e5e7eb → chartColors helper |
| `apps/admin/src/features/subpage-feedback/ui/FeedbackPositiveReasonsChart.tsx` | BAR_COLORS 상수 → chartColors.palette |
| `apps/admin/src/features/subpage-version/ui/BlockDiffSummary.tsx` | bg-emerald-600/amber-600 → Badge wrapper (success/warning variant) |
| `apps/admin/src/features/subpage-version/ui/RecentVersionsCard.tsx` | text-amber-600 → text-warning (pin 아이콘) |
| `apps/admin/src/features/subpage-version/ui/VersionHistoryDialog.tsx` | text-amber-600 → text-warning (pin 아이콘) |
| `apps/admin/src/features/subpage-version/ui/VersionDetailDialog.tsx` | bg-red-50/60 + bg-emerald-50/60 → bg-destructive/10 + bg-success/10 (diff 셀) |
| `apps/admin/CLAUDE.md` | Badge wrapper + chartColors 패턴 안내 추가 |
| `CLAUDE.md` (루트) | Stage 15c-3b 행 추가 |
| `docs/stages/stage-15c-3b.md` | 이 파일 (신규) |

## B1 — Badge wrapper

### `apps/admin/src/shared/ui/Badge.tsx`

shadcn `badge.tsx` 직접 수정 금지 — Popover/Select/DropdownMenu/Sheet wrapper 패턴과 일관.

```tsx
export function Badge({ variant, className, ...props }: BadgeProps) {
  if (variant === 'success') {
    return <ShadcnBadge {...} variant="default"
      className={cn('border-transparent bg-success text-success-foreground', className)} />;
  }
  if (variant === 'warning') {
    return <ShadcnBadge {...} variant="default"
      className={cn('border-transparent bg-warning text-warning-foreground', className)} />;
  }
  return <ShadcnBadge {...props} variant={variant as ShadcnVariant} className={className} />;
}
```

ESLint `no-restricted-imports` 가드는 이번 PR에서 보류 — 기존 호출처(~50곳) 일괄 검토 필요. 신규 사용처에만 자연 채택, 기존은 점진 swap.

**사용 예시**:
```tsx
<Badge variant="success">+추가 {n}</Badge>
<Badge variant="warning">~수정 {n}</Badge>
<Badge variant="destructive">삭제</Badge>  // 기존 shadcn variant 그대로 통과
```

## B2 — raw color swap (14곳)

| 위치 | 변경 전 | 변경 후 |
|---|---|---|
| AuditLogDetailDialog diff 이전 | `bg-red-50 text-red-600` | `bg-destructive/10 text-destructive` |
| AuditLogDetailDialog diff 이후 | `bg-green-50 text-green-600` | `bg-success/10 text-success` |
| SlugField 3곳 (board/post/subpage) | `text-amber-600` | `text-warning` |
| DomainSettingsForm DNS 상태 | `text-green-600`, `text-amber-600` | `text-success`, `text-warning` |
| FeedbackBySubpageTable 수치 | `text-green-700`, `text-red-700` | `text-success`, `text-destructive` |
| FeedbackBySubpageTable 긍정율 bar | `bg-green-600` | `bg-success` |
| RatingBadge | `bg-green-100 text-green-800` | `<Badge variant="success">` |
| RatingBadge | `bg-red-100 text-red-800` | `<Badge variant="destructive">` |
| BlockDiffSummary 추가 | `bg-emerald-600` | `<Badge variant="success">` |
| BlockDiffSummary 수정 | `bg-amber-600` | `<Badge variant="warning">` |
| RecentVersionsCard pin | `text-amber-600` | `text-warning` |
| VersionHistoryDialog pin | `text-amber-600` | `text-warning` |
| VersionDetailDialog diff 셀 이전 | `bg-red-50/60 dark:bg-red-900/20` | `bg-destructive/10` |
| VersionDetailDialog diff 셀 이후 | `bg-emerald-50/60 dark:bg-emerald-900/20` | `bg-success/10` |

다크 모드 dark: 클래스가 제거된 경우: 토큰 자체가 `.dark` 페어를 가지므로 별도 dark: 클래스 불필요.

## B3 — chartColors helper

### `apps/admin/src/shared/lib/chartColors.ts`

```ts
export function getChartColors() {
  if (typeof window === 'undefined') return FALLBACK;
  const computed = getComputedStyle(document.documentElement);
  return {
    positive: v('--success', ...),
    negative: v('--destructive', ...),
    warning: v('--warning', ...),
    muted: v('--muted-foreground', ...),
    border: v('--border', ...),
    palette: [v('--chart-1', ...), ..., v('--chart-5', ...)],
  };
}
```

`getComputedStyle().getPropertyValue('--success')`는 `oklch(L C H)` 전체 문자열을 반환. Recharts `fill`/`stroke`는 모든 CSS color 문자열을 허용하므로 변환 불필요.

**적용 파일**:
- `FeedbackTimelineChart`: CartesianGrid stroke + XAxis/YAxis tick fill + Bar fill (positive/negative) + Tooltip border
- `FeedbackPositiveReasonsChart`: CartesianGrid stroke + XAxis/YAxis tick fill + Cell fill (palette) + Tooltip border

다크 모드 실시간 갱신은 future work. MVP는 mount 시점 1회 (`useMemo(() => getChartColors(), [])`) — 재방문/다크 모드 토글 시 재마운트로 갱신.

## 검증 결과

```
pnpm --filter @simple-cms/admin typecheck  → 통과 (오류 0)
pnpm --filter @simple-cms/admin lint       → 통과 (기존 warning 9건, 신규 0건)
pnpm --filter @simple-cms/admin build      → 통과 (75 routes)
```

## 후속 PR

| Stage | 내용 |
|---|---|
| **15c-3c** | AlertDialog wrapper(size 4단) + ESLint 가드 + PageHeader 2곳 정정 |
| **15c-3d** | Card baseline 보정 (별도 plan, 1주 visual review 후) |
