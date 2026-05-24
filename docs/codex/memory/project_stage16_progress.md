<!--
Codex migration note: this file is a Codex-friendly instruction/reference file.
Codex automatically reads AGENTS.md files by directory scope.
-->
---
name: Stage 16 코드 최적화 진행 현황
description: Stage 16 sub-stage 완료 상태 및 다음 작업 — 세션 컨텍스트 단절 복구용
type: project
originSessionId: e5a2cfb0-d1e9-4009-8ea9-daaab51e28df
---
Stage 16 코드 최적화(~2,850 LOC 절감 목표) 진행 중. 브랜치: `feature/deploy`.

**Why:** 기능 개발(Stage 1~15c-3f) 완료 후 SSOT 통합 + 공통 컴포넌트 추출로 중복 제거.

## 완료된 sub-stage

| Sub | 커밋 | 내용 |
|---|---|---|
| 16a | 완료 | `requireAnyPermission` 신설 + `findUnique` slug/key → `findFirst` 전환 |
| 16c-1 | 완료 | `ListSnapshot<T>` 중복 → `shared/api/types.ts` 단일 출처, `PaginatedList<T>` 통합 |
| 16c-2 | 완료 | mutation 훅 팩토리 4개 신설 + 11 도메인 mutation 훅 마이그레이션 |
| 16d | **73ad6c7** | `BulkDeleteDialog` + `ConfirmDeleteDialog` 공용 컴포넌트 추출 + 7 dialog 마이그레이션 |
| 16e | **b523e95** | `SlugField` + `StatusBadge` + `UrlFilterTabs` SSOT 통합 |
| 16b-1 | **8882d9b** | `defineRoute`/`defineBulkOperation`/`renormalizeDisplayOrder` 인프라 신설 + subpages 11 라우트 마이그레이션 |
| 16f | **7195f2c** | `SettingsCardForm` 공용 컴포넌트 신설 + DomainSettingsForm/UploadSettingsForm/SeoSettingsForm 마이그레이션 |
| 16b-2-a | **4a14546** | posts 6 라우트 `defineRoute`/`defineBulkOperation` 마이그레이션 + `buildPostPatchDiff` 신설 |
| 16b-2-b | **ef89b1e** | boards 3 라우트 `defineRoute` 마이그레이션 + `renormalizeDisplayOrder` 'board' 추가 + `buildBoardPatchDiff` 신설 |
| 16b-2-c | **7cf4896** | media 4 라우트 `defineRoute`/`defineBulkOperation` 마이그레이션 (upload/branding-upload 범위 외) |

## 다음 작업

Stage 16b-2 (posts/boards/media 마이그레이션)와 16f (SettingsCardForm) 모두 완료됨.

**남은 후속 작업 후보 (명시적 지시 있을 때만):**
1. **16b-2-d (선택)**: navigation/home/home-popups/users/roles/settings 등 잔여 도메인 마이그레이션
2. **16b-2 후속 정리 (선택)**: subpages PATCH diff 30줄을 `buildSubpagePatchDiff`로 추출
3. **16f 후속 (선택)**: BrandingSettingsForm 4분할 흡수 / SettingsToggleCard 신설

## 의도적 제외

- `media/upload`, `media/branding-upload`: multipart/form-data + `requireAuth`(not requirePermission) → `defineRoute` 부적합
- auth 3 + demo 3 route: requirePermission 의도적 제외
- audit-logs export: 파일 응답이라 ApiResponse 래핑 충돌

**How to apply:** 세션 시작 시 이 메모리 확인 후 다음 작업 결정.
