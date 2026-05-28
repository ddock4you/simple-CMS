# Stage 15c-3f — 폼 컨트롤 height 통일 + audit-logs Excel 패턴 정렬

## 목적

PageToolbar 상단 슬롯의 폼 컨트롤들이 1~5px 어긋나는 잔여 불일치를 해소하고, `/audit-logs` Excel 다운로드를 `/subpage-feedback`과 동일한 단일 버튼 패턴으로 통일.

## 변경 파일 목록

### A. 폼 컨트롤 height 통일 (32px baseline)

| 파일 | 변경 유형 | 내용 |
|---|---|---|
| `apps/admin/src/shared/ui/Button.tsx` | **신규** | Button wrapper — sm size h-7→h-8 override, `buttonVariants` re-export |
| `apps/admin/eslint.config.mjs` | 수정 | `no-restricted-imports`에 `@/shared/ui/shadcn/button` 추가 |
| 92개 호출처 파일 | 수정 | import path: `@/shared/ui/shadcn/button` → `@/shared/ui/Button` |
| `apps/admin/src/shared/ui/DatePicker.tsx` | 수정 | SelectTrigger `className="h-8 w-[80px]"` → `"w-[80px]"` (2곳) |
| `apps/admin/app/globals.css` | 수정 | `@theme inline`에 `--control-h-*` 4개 토큰 추가 |

### B. audit-logs Excel 패턴 정렬

| 파일 | 변경 유형 | 내용 |
|---|---|---|
| `apps/admin/src/features/audit-log/ui/AuditLogExport.tsx` | **재작성** | 인라인 DatePicker 2개 제거, 단일 버튼 + 화면 필터 반영 |
| `apps/admin/src/pages/audit-logs/ui/AuditLogsPage.tsx` | 수정 | `<AuditLogExport>` 6개 props 주입 |
| `apps/admin/src/features/audit-log/model/auditLogSchemas.ts` | 수정 | `from`/`to` optional로 변경, `q` 필드 추가 |
| `apps/admin/src/features/audit-log/model/auditLogFilters.ts` | 수정 | `ENTITY_TYPE_LABELS`에 `AUDIT_LOG: '감사 로그'` 추가 |
| `apps/admin/app/api/audit-logs/export/route.ts` | **재작성** | KST 30일 폴백 + q 필터 + X-Row-Count 헤더 + logAuditEvent |
| `packages/db/prisma/schema.prisma` | 수정 | `AuditEntityType` enum에 `AUDIT_LOG` 추가 |

### C. 문서

| 파일 | 변경 유형 | 내용 |
|---|---|---|
| `apps/admin/design.md` | 수정 | §4.5 신설 + §7 height 컬럼 + Button wrapper 정책 + §8 Do/Don't + 부록 B |
| `apps/admin/AGENTS.md` | 수정 | UI 전략에 Button wrapper + 폼 컨트롤 height 단락 추가 |
| `AGENTS.md` (루트) | 수정 | Stage 15c-3f 행 추가 |
| `docs/codex/commands/create-feature.md` | 수정 | 폼 컨트롤 size 1줄 추가 |
| `docs/codex/commands/review-code.md` | 수정 | 폼 컨트롤 height 체크리스트 항목 추가 |

## 결정 사항

| 결정 | 선택 | 사유 |
|---|---|---|
| shadcn/button.tsx 처리 | **무수정 유지** | `apps/admin/AGENTS.md` 정책 — "shadcn/ui 컴포넌트는 직접 코드 수정 금지" |
| sm size 처리 | `cn('h-8', className)` override in wrapper | Tailwind merge 후승으로 h-7 대체 |
| 인라인 테이블 토글 | **영구 예외 유지** | 행 density 유지 목적 |
| AuditEntityType 마이그레이션 | `pnpm db:push` 사용 | 프로젝트 정책 — `migrate dev` 금지 |

## Before / After

### Button wrapper sm 적용 전후

**Before** (`shadcn/button.tsx` sm variant):
```
height: 1.75rem (28px)  ← shadcn sm 기본값
```

**After** (`shared/ui/Button.tsx` wrapper):
```
height: 2rem (32px)  ← cn('h-8', className) override
```

영향 대상: ListSearchInput [검색] 버튼, StatusFilter 4종, OrderActionButtons, BulkActionBar 등 `size="sm"` 사용처 전체 자동 정렬.

### audit-logs Excel Before / After

**Before**:
- 인라인 DatePicker 2개 (from/to) + 다운로드 버튼
- action/entityType/userId/q 4개 필터가 다운로드에 미반영

**After**:
- 단일 [Excel 다운로드] 버튼 — 화면에 표시된 6개 필터 전체 반영
- `/subpage-feedback` FeedbackExport와 1:1 동일 패턴

## 검증 결과

- `pnpm --filter @simple-cms/admin typecheck` ✅ 0 errors
- `pnpm --filter @simple-cms/admin lint` ✅ `no-restricted-imports` 위반 0건
- `pnpm --filter @simple-cms/admin build` ✅ 통과
- `pnpm db:push` ✅ `AUDIT_LOG` enum 반영
- Grep `from '@/shared/ui/shadcn/button'` → 1건 (Button.tsx 자기 자신, 예외) ✅
