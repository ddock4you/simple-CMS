# Stage 15c-3e — AlertDialog size 토큰 3-tier

## 범위

design.md §7 AlertDialog 항목에 size 토큰 3-tier(`confirm | default | wide`)를 신설하고, 기존 10개 호출처의 ad-hoc `max-w-*` className을 size prop으로 마이그레이션.

15c-3c에서 import 경로 통합(24곳)만 한 것을 확장해, wrapper에 실질적 토큰 적용.

## 변경 파일

| 파일 | 변경 내용 |
|---|---|
| `apps/admin/src/shared/ui/shadcn/alert-dialog.tsx` | size type `"default"\|"sm"` → `"confirm"\|"default"\|"wide"` + 3-tier className selectors |
| `apps/admin/src/shared/ui/AlertDialog.tsx` | 단순 re-export → `AlertDialogContent` wrapper 함수화 (`size = 'confirm'` default) |
| 8× `features/*/ui/BulkXxx*.tsx` | `className="max-w-xl"` → `size="wide"` |
| `features/media-management/ui/DeleteMediaDialog.tsx` | `className="max-w-lg"` → `size="default"` |
| `features/subpage-version/ui/RestoreVersionAlertDialog.tsx` | `className="sm:max-w-md"` 제거 (confirm 기본값으로 흡수) |
| `apps/admin/design.md` | §7 Dialog → Dialog/AlertDialog 분리 + size 토큰 표 신설 |
| `apps/admin/AGENTS.md` | AlertDialog wrapper 패턴 안내 갱신 (size 3-tier 설명 추가) |
| `AGENTS.md` (루트) | Stage 15c-3e 행 추가 |
| `docs/stages/stage-15c-3e.md` | 이 파일 (신규) |

## size 토큰 설계

| size 토큰 | max-width | 사용 의도 | 기본값 |
|---|---|---|---|
| `confirm` | `max-w-xs sm:max-w-sm` | 단순 확인/거절 (1~2줄) | ✅ |
| `default` | `max-w-md` | 소량 동적 콘텐츠 (DeleteMedia, RestoreVersion 등) | — |
| `wide` | `max-w-xl` | 참조 목록 등 동적 콘텐츠 (BulkXxx 8개) | — |

### 왜 3-tier?

- 기존 `"default" | "sm"` 2-tier에서 `sm`은 실제 사용처 0개 — 정리 대상
- 8개 BulkXxx의 `max-w-xl`(참조 목록 표시)과 단순 confirm의 의도가 다름 → 2-tier로는 표현 불가
- 4-tier는 AlertDialog(confirm-only)에 과잉 — 현재 use case로 3개가 적합

### `confirm`을 기본값으로 선택한 이유

- 기존 14개 단순 confirm Dialog는 size prop 없이 사용 → `confirm`이 기본값이어야 visual regression 0
- 이전 `"default"` tier의 시각(max-w-xs sm:max-w-sm)이 새 `"confirm"`에 그대로 매핑 → backward-compatible

## 호출처 매핑 (10개 변경)

| 파일 | 변경 전 | 변경 후 |
|---|---|---|
| BulkDeleteMediaDialog | `className="max-w-xl"` | `size="wide"` |
| BulkDeletePostDialog | `className="max-w-xl"` | `size="wide"` |
| BulkMovePostDialog | `className="max-w-xl"` | `size="wide"` |
| BulkDeleteSubpageDialog | `className="max-w-xl"` | `size="wide"` |
| BulkApproveUserDialog | `className="max-w-xl"` | `size="wide"` |
| BulkReactivateUserDialog | `className="max-w-xl"` | `size="wide"` |
| BulkRejectUserDialog | `className="max-w-xl"` | `size="wide"` |
| BulkSuspendUserDialog | `className="max-w-xl"` | `size="wide"` |
| DeleteMediaDialog | `className="max-w-lg"` | `size="default"` |
| RestoreVersionAlertDialog | `className="sm:max-w-md"` | 제거 (confirm 기본값) |

나머지 14개 단순 confirm Dialog: size prop 없음 → `confirm` 기본값으로 자동 적용, 변경 없음.

## 검증 결과

```
pnpm --filter @simple-cms/admin typecheck  → 통과 (오류 0)
pnpm --filter @simple-cms/admin lint       → 통과 (기존 warning 9건, 신규 0건)
pnpm --filter @simple-cms/admin build      → 통과
```

## 시각 검토 대상

| 영역 | 확인 사항 |
|---|---|
| `/users` | BulkApprove/Reject/Suspend/Reactivate (wide) |
| `/subpages` | BulkDelete/BulkStatus (wide/default) |
| `/posts` | BulkDelete/BulkMove (wide) |
| `/media` | BulkDelete (wide), DeleteMedia (default) |
| `/subpages/[id]` | RestoreVersion (confirm 기본값, 폭 변화 없음) |

## 후속 PR

| Stage | 내용 |
|---|---|
| **15c-4** | Storybook AlertDialog stories에 confirm/default/wide 3종 + play function (size별 popup 폭 검증) |
