# Stage 15c-2 — admin 광범위 design 정합성 PR

## 개요

Stage 15c-1에서 이연된 두 항목(① 도메인 UI shadow 표면 정합성, ② Boolean Switch 5폼 통일)과 추가 항목(③ shadow 토큰 wrapper 패턴 확립, ④ spacing/micro-interaction 토큰, ⑤ 타이포그래피 정합)을 단일 PR로 묶어 처리.

## 변경 요약

### C1 — globals.css foundation 토큰

- `@theme inline`에 `--spacing-page-x: 24px` · `--spacing-card: 24px` 추가
- `@layer base`에 button press micro-interaction:
  ```css
  [data-slot="button"]:not(:disabled):not([aria-haspopup]):active {
    scale: 0.98;
    transition: scale 80ms ease-out;
  }
  ```
  - CSS individual `scale` property로 Tailwind cva `translate-y-px`(`translate` property)와 합성 충돌 없음

### C2 — wrapper 4개 신설

| 파일 | 대상 |
|---|---|
| `shared/ui/Popover.tsx` | `PopoverContent` + 나머지 re-export |
| `shared/ui/DropdownMenu.tsx` | `DropdownMenuContent` + `DropdownMenuSubContent` + 나머지 |
| `shared/ui/Select.tsx` | `SelectContent` + 나머지 |
| `shared/ui/Sheet.tsx` | `SheetContent` + 나머지 |

각 `Content`류에 `cn('shadow-popover', className)` 주입. twMerge로 shadcn 내부 shadow-md/lg override.

### C3 — import swap batch 1 (Popover · DropdownMenu · Sheet)

shadcn 원본 → wrapper로 교체한 파일:
- `shared/ui/DatePicker.tsx`
- `shared/ui/layout/UserNav.tsx`
- `shared/ui/layout/UserNavFooter.tsx`
- `shared/ui/PageToolbar.tsx`
- `features/block-management/ui/BlockManager.tsx`

### C4 — import swap batch 2 (Select, 22파일)

- `features/error-log/ui/ErrorLogFilters.tsx`
- `features/user-management/ui/BulkChangeUserRoleDialog.tsx`
- `features/subpage-feedback/ui/FeedbackFilters.tsx`
- `features/media-management/ui/MediaFilters.tsx`
- `features/audit-log/ui/AuditLogFilters.tsx`
- `features/popup-management/ui/PopupForm.tsx`
- `features/subpage-version/ui/VersionHistoryDialog.tsx`
- `features/board-management/ui/BoardForm.tsx`
- `features/post-management/ui/PostForm.tsx`
- `features/subpage-management/ui/SubpageForm.tsx`
- `features/subpage-version/ui/RestoreVersionAlertDialog.tsx`
- `entities/link-target/ui/LinkTargetInput.tsx`
- `features/navigation-management/ui/MenuItemDialog.tsx`
- `features/post-management/ui/BulkMovePostDialog.tsx`
- `features/post-management/ui/BulkStatusPostDialog.tsx`
- `features/subpage-management/ui/BulkStatusSubpageDialog.tsx`
- `shared/ui/InlineStatusToggle.tsx`
- `features/block-management/ui/fields/IframeBlockFields.tsx`
- `features/block-management/ui/fields/LatestPostsFields.tsx`
- `features/user-management/ui/UserRoleSelect.tsx`
- `features/site-settings/ui/SecuritySettingsForm.tsx`
- `features/post-management/ui/PostBoardFilter.tsx`

### C5 — 직접 swap (sidebar + MediaCard + typography)

- `entities/media/ui/MediaCard.tsx:61` — `shadow-sm` → `shadow-card`
- `shared/ui/shadcn/sidebar.tsx` 2곳 — `shadow-sm` → `shadow-card` (admin variant 예외)
- `shared/ui/PageHeader.tsx:47` — `font-bold leading-tight` → `font-semibold tracking-tight` (design.md page-title 매핑)

### C6 — BooleanSwitchField + 5폼 + ESLint + 문서

**BooleanSwitchField** (`shared/ui/BooleanSwitchField.tsx`):
- Generic `<T extends FieldValues>` 컴포넌트
- RHF `Controller + Switch + label + description + error` 통합
- `disabled` prop으로 조건부 비활성화

**5폼 적용**:

| 폼 | 필드 | 변경 전 | 변경 후 |
|---|---|---|---|
| SubpageForm | `cclAi` | Controller + Checkbox | BooleanSwitchField (disabled=`cclType===null`) |
| SubpageForm | `feedbackEnabled` | Controller + Checkbox | BooleanSwitchField + description |
| BoardForm | `isPublic` | Controller + Select (boolean) | BooleanSwitchField |
| MenuItemDialog | `isVisible` | Controller + Select (boolean) | BooleanSwitchField |
| MenuItemDialog | `openInNewTab` | Controller + Select (boolean) | BooleanSwitchField |
| PopupForm | `isVisible` | Controller + Checkbox | BooleanSwitchField |
| SecuritySettingsForm | `CONCURRENT_LOGIN_ENABLED` | Select + external Button trigger | Switch + controlled AlertDialog |

**ESLint 가드** (`apps/admin/eslint.config.mjs`):
- `no-restricted-imports` — shadcn/popover·dropdown-menu·select·sheet 직접 import 차단
- 예외: wrapper 4개 파일 + `src/shared/ui/shadcn/**` 내부

## 회귀 0건 확인 포인트

- `cclType === null` → cclAi Switch `disabled` + setValue('cclAi', false) (RadioOption onChange 분기 유지)
- SubpageForm CCL `superRefine` — schema 로직 무변경
- SecuritySettingsForm AlertDialog — controlled mode(`open`/`onOpenChange`)로 동일 확인 흐름 유지
- MediaCard disabled + Tooltip disabledReason — shadow-card만 추가, 기존 동작 무변경

## 검증

```bash
pnpm --filter @simple-cms/admin typecheck  # 통과
pnpm --filter @simple-cms/admin lint       # 0 errors
pnpm --filter @simple-cms/admin build      # 통과
```
