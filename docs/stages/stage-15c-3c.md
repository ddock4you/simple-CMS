# Stage 15c-3c — AlertDialog wrapper + ESLint 가드 + PageHeader 2곳 정정

## 범위

15c-3b에서 Badge wrapper + chartColors를 완성한 후속 PR. 시각 회귀 0을 보장하면서 향후 AlertDialog size 토큰 도입의 진입점을 통합한다.

**size 4단은 별도 PR(15c-3e)로 분리.** 15c-3a 후속 표에 적힌 "size 4단" 계획은 실제 shadcn AlertDialog 구조(`default | sm` 2단 + `group-data-[size]` layout selector)를 파악하기 전의 추측이었으며, 현재 `max-w-xl` 8건은 Dialog 토큰 md(32rem)와 lg(48rem) 사이에 위치해 자연 매핑이 없다. 시각 의사결정은 별도 PR에서 수행.

## 변경 파일

| 파일 | 변경 내용 |
|---|---|
| `apps/admin/src/shared/ui/AlertDialog.tsx` | **신규** — shadcn alert-dialog 12개 export 단순 re-export |
| `apps/admin/eslint.config.mjs` | `no-restricted-imports` paths에 alert-dialog 추가 + files 예외 추가 (+2줄) |
| `apps/admin/src/pages/profile/ui/ProfilePage.tsx` | `<h1 className="text-2xl font-bold">` + `<p>` → `<PageHeader title description />` |
| `apps/admin/src/pages/navigation-management/ui/NavigationEditClient.tsx` | `<h1>` + ArrowLeft + `<p>` → `<PageHeader back title description actions />` |
| 24개 호출처 | import 경로 1줄 (`shadcn/alert-dialog` → `AlertDialog`) |
| `apps/admin/CLAUDE.md` | AlertDialog wrapper 패턴 안내 추가 |
| `CLAUDE.md` (루트) | Stage 15c-3c 행 추가 |
| `docs/stages/stage-15c-3c.md` | 이 파일 (신규) |

### 24개 호출처 파일 목록

```
features/subpage-version/ui/VersionHistoryDialog.tsx
features/subpage-version/ui/RestoreVersionAlertDialog.tsx
features/site-settings/ui/SecuritySettingsForm.tsx
features/subpage-management/ui/BulkStatusSubpageDialog.tsx
features/subpage-management/ui/BulkDeleteSubpageDialog.tsx
features/subpage-management/ui/DeleteSubpageDialog.tsx
features/post-management/ui/BulkStatusPostDialog.tsx
features/post-management/ui/BulkMovePostDialog.tsx
features/post-management/ui/BulkDeletePostDialog.tsx
features/post-management/ui/DeletePostDialog.tsx
features/user-management/ui/BulkApproveUserDialog.tsx
features/user-management/ui/BulkRejectUserDialog.tsx
features/user-management/ui/BulkSuspendUserDialog.tsx
features/user-management/ui/BulkReactivateUserDialog.tsx
features/user-management/ui/UserActionButtons.tsx
features/popup-management/ui/DeletePopupDialog.tsx
features/board-management/ui/DeleteBoardDialog.tsx
features/block-management/ui/DeleteBlockDialog.tsx
features/media-management/ui/DeleteMediaDialog.tsx
features/media-management/ui/BulkDeleteMediaDialog.tsx
features/error-log/ui/BulkResolveButton.tsx
features/navigation-management/ui/DeleteMenuSetDialog.tsx
features/role-management/ui/RoleList.tsx
shared/ui/ConfirmLeaveDialog.tsx
```

`shared/ui/shadcn/AlertDialog.stories.tsx` 제외 — ESLint 기존 `shadcn/**` 예외로 보호.

## C1 — AlertDialog wrapper

### `apps/admin/src/shared/ui/AlertDialog.tsx`

shadcn alert-dialog.tsx의 12개 export를 단순 re-export. **size 토큰 미도입 — 시각 무변경.**

- shadow-popover 주입 없음 — AlertDialog는 `ring-1 ring-foreground/10` 사용 (design.md §5 표 미포함)
- 향후 15c-3e에서 `AlertDialogContent`만 wrapper 함수로 교체하여 size prop 도입 진입점 확보

## C2 — ESLint 가드

`apps/admin/eslint.config.mjs`에 기존 4개 wrapper 패턴과 동일하게 +2줄:

1. `paths` 배열에 `@/shared/ui/shadcn/alert-dialog` 차단 항목 추가
2. `files` 예외 배열에 `src/shared/ui/AlertDialog.tsx` 추가

기존 `src/shared/ui/shadcn/**` 예외가 AlertDialog.stories.tsx를 자동 보호.

## C3 — import 경로 swap

**변경 패턴**: `from '@/shared/ui/shadcn/alert-dialog'` → `from '@/shared/ui/AlertDialog'`

max-w-* className 등 모든 다른 props 유지 → 시각 회귀 0.

## C4 — PageHeader 2곳 정정

### ProfilePage.tsx

`text-2xl font-bold` → PageHeader(`text-2xl font-semibold tracking-tight`). design.md SSOT 준수.

```tsx
// Before
<div>
  <h1 className="text-2xl font-bold">내 정보</h1>
  <p className="text-muted-foreground">...</p>
</div>

// After
<PageHeader title="내 정보" description="..." />
```

### NavigationEditClient.tsx

back 버튼 + title(name+badges) + description + actions(MenuSetEditDialog) 모두 PageHeader로 통합.

`font-bold` → `font-semibold tracking-tight`는 design.md SSOT 준수 **의도된 변경** (font-weight 1단계 ↓).

## 검증 결과

```
pnpm --filter @simple-cms/admin typecheck  → 통과 (오류 0)
pnpm --filter @simple-cms/admin lint       → 통과 (기존 warning 9건, 신규 0건)
pnpm --filter @simple-cms/admin build      → 통과
```

shadcn `shared/ui/shadcn/alert-dialog` 직접 import: 1건 (AlertDialog.stories.tsx) — ESLint 예외 적용.

## 후속 PR

| Stage | 내용 |
|---|---|
| **15c-3d** | Card baseline 보정 (별도 plan, 1주 visual review 후) |
| **15c-3e** (신규) | AlertDialog size 토큰 설계 (2단 vs 4단 결정) + 24 호출처 className → size prop 마이그레이션 + `group-data-[size]` layout 분기 검토 |
