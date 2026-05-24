<!--
Codex migration note: this file is a Codex-friendly instruction/reference file.
Codex automatically reads AGENTS.md files by directory scope.
-->
현재 대화 컨텍스트를 분석하여 **서브페이지 버전 관리 기능 (이력/롤백/작성자 필터 · 깃 커밋 스타일 메모)**을 구현해줘.

## 동작 순서

1. **현재 상태 파악**: 아래 Phase 중 어디까지 구현되었는지 확인한다.
   - Prisma 스키마에 `SubpageVersion` 모델 + `SubpageVersionSource` enum + `Subpage.revision` 필드 존재 여부 → `packages/db/prisma/schema.prisma`
   - `AuditEntityType`에 `SUBPAGE_VERSION` 포함 여부 → 동일 schema + `apps/admin/src/features/audit-log/model/auditLogFilters.ts`의 `ENTITY_TYPE_LABELS`
   - 공용 타입 존재 여부 → `packages/types/src/dto/subpage-version.dto.ts`, `packages/types/src/domain/subpage.types.ts` (`SubpageVersionSource` union + 라벨 상수)
   - DB 헬퍼 → `packages/db/src/subpageVersion.ts` (`createSubpageVersionSnapshot`, `restoreSubpageFromVersion`, `findDanglingMediaIds`, `RevisionMismatchError` 등)
   - API Routes → `apps/admin/app/api/subpages/[id]/versions/` (GET/POST + `[versionId]` GET/PATCH/DELETE + `rollback` POST)
   - FSD 슬라이스 → `apps/admin/src/features/subpage-version/` (api/model/lib/ui)
   - UI 통합 → `SubpageView.tsx`(툴바에 `SaveVersionButton` + 우측 `RecentVersionsCard` + Dialog state 3종)
2. **다음 Phase 구현**: 미완료된 가장 앞 Phase의 코드를 생성한다.
3. **컨벤션 검증**: FSD 구조, 감사 로그 연동, 권한 체크, 낙관 동시성 범위, 메모 파싱, Dialog 함정 회피 패턴을 확인한다.

## 전제 조건

- `Subpage` + `PageBlock` 모델이 이미 존재해야 한다 (Stage 6 통합 블록 모델)
- `Media` 라이브러리 + `findMediaReferences()` 헬퍼가 이미 존재해야 한다 (Stage 5a-2)
- `BlockContentView`(`features/block-management/ui/BlockContentView.tsx`)가 이미 존재해야 한다 — 버전 상세에서 재사용
- `ApiResponse<T>`가 `code?: string` 선택 필드를 지원해야 한다 (`packages/types/src/common.types.ts`)
- 전제 조건 미충족 시 먼저 구현해야 할 항목을 안내한다

## 핵심 설계 원칙 (advisor settled + 실사용 검증)

| 항목 | 결정 | 이유 |
|------|------|------|
| 저장 모델 | 단일 테이블 JSON 스냅샷 (`SubpageVersion.snapshot Json`) | 50블록/페이지는 sub-MB, 버전 내부 검색 수요 없음. 정규화의 이득 0 |
| 메모 | 단일 `label String? @db.Text` (≤10,000자), 깃 커밋 스타일 | 첫 줄=요약(72자 truncate), 빈 줄 뒤=본문. 비우고 저장 가능 |
| 저장 트리거 | MANUAL([버전 저장] 버튼) + AUTO_PUBLISH(DRAFT→PUBLISHED) + PRE_ROLLBACK(롤백 직전) | debounced 자동은 노이즈 폭증 + 블록 CUD마다 생성은 과잉 |
| 블록 reorder/CUD | **버전 생성 안 함** + **revision 건드리지 않음** | 개별 블록 변경은 체크포인트 가치 낮음 + 메타 저장과 race 유발 |
| 롤백 | 소프트 — 트랜잭션 내 PRE_ROLLBACK 자동 백업 → slug 충돌 검사 → meta 덮어쓰기 → blocks 재생성 → `recalculateSubpageContent`(트랜잭션 밖) | 하드 overwrite 위험 회피 |
| 권한 | `subpages:update` 재사용 (목록만 `subpages:read`) | 별도 리소스 신설 시 seed/role migration 부담 |
| 낙관 동시성 | **rollback 엔드포인트에서만** `expectedRevision` guard + `revision++` | 메타/블록에 guard 적용 시 `staleTime × prefetch × Next route cache`로 혼자 작업 시에도 false positive 반복 |
| Media 참조 | `findMediaReferences()` 확장 **안 함**. 롤백 시 `findDanglingMediaIds` 경고 + 체크박스 ack | 확장 시 장기 운영 Subpage의 Media 삭제가 실질 불가능해짐 |
| 보존 | non-pinned 30개 상한, save handler 내 lazy cleanup | 시간 기준보다 개수 기준이 직관. cron 불필요 |
| UI 위치 | **뷰 페이지 툴바**에 `SaveVersionButton` (편집 페이지 아님) | 현재 DB 상태 스냅샷이라는 의미와 뷰 페이지 맥락 일치 |
| 미리보기 | admin 내부 `BlockContentView` 재사용만 (이번 범위) | web 공개 렌더 미리보기는 별도 후속 과제 |

## Phase별 생성 대상

### Phase A: Prisma 스키마 + 공용 타입

| 대상 | 파일 | 핵심 |
|------|------|------|
| enum 추가 | `packages/db/prisma/schema.prisma` | `SubpageVersionSource { MANUAL | AUTO_PUBLISH | PRE_ROLLBACK }` + `AuditEntityType`에 `SUBPAGE_VERSION` 추가 |
| Subpage.revision | 동일 | `revision Int @default(0)` — rollback에서만 증분 |
| SubpageVersion 모델 | 동일 | `id/subpageId/createdById/createdAt/label @db.Text/snapshot Json/isPinned/sourceAction` + 인덱스 `(subpageId, createdAt)`, `createdById`, `isPinned` + `User.subpageVersions` 역관계(`@relation("SubpageVersionAuthor")`) |
| 도메인 union | `packages/types/src/domain/subpage.types.ts` | `SubpageVersionSource` union + `SUBPAGE_VERSION_SOURCE_LABELS` + `SubpageVersionStatusStrategy = 'KEEP_CURRENT' | 'APPLY_VERSION'` + `SubpageContentStatus = 'DRAFT' | 'PUBLISHED'` (Prisma runtime에 의존하지 않도록 모두 union) |
| DTO | `packages/types/src/dto/subpage-version.dto.ts` | `SubpageVersionSnapshotMeta/Block/Snapshot`, `SubpageVersionListItem/Detail/ListResponse/ListFilters`, `CreateSubpageVersionDto` (`label?`), `RollbackSubpageVersionDto` (`expectedRevision`, `statusStrategy?`, `acknowledgeDangling?`), `UpdateSubpageVersionDto` (`isPinned`) + 상수 `SUBPAGE_VERSION_RETENTION_LIMIT=30`, `SUBPAGE_VERSION_LABEL_MAX_LENGTH=10000`, `SUBPAGE_VERSION_SUBJECT_DISPLAY_LIMIT=72` |
| index | `packages/types/src/index.ts` | 위 타입/상수 re-export |
| audit 라벨 | `apps/admin/src/features/audit-log/model/auditLogFilters.ts` | `ENTITY_TYPE_LABELS`에 `SUBPAGE_VERSION: '서브페이지 버전'` 추가 |

**스냅샷 meta 필드 선택**: `title/slug/seoTitle/seoDescription/status/cclType/cclAi/featuredImageId/displayOrder` — `publishedAt`은 제외(롤백 시 재계산). blocks는 `id` 제외하고 저장 (롤백 시 새 cuid 재생성).

마이그레이션: `pnpm db:generate` + `pnpm db:push` (AGENTS.md DB Migration Policy: `migrate dev` 금지).

### Phase B: DB 헬퍼

| 대상 | 파일 | 핵심 |
|------|------|------|
| 스냅샷/롤백 헬퍼 | `packages/db/src/subpageVersion.ts` (신규) | `createSubpageVersionSnapshot({subpageId, createdById, label?, sourceAction, tx?})`: Subpage + blocks 읽어 snapshot 생성 + `enforceRetention` 호출. `restoreSubpageFromVersion({subpageId, versionId, actorId, expectedRevision, statusStrategy?})`: 트랜잭션 내 revision guard → PRE_ROLLBACK 자동 백업 → slug 충돌 검사 → Subpage 메타 덮어쓰기 + `revision++` → `pageBlock.deleteMany` + `createMany`. `findDanglingMediaIds(snapshot)`: IMAGE 블록 `imageMediaId` + RICH_TEXT Tiptap image 노드 `attrs.mediaId` 재귀 수집 → `Media.findMany` 차집합. `enforceRetention(tx, subpageId, limit)`: `isPinned=false` 초과 시 `createdAt asc` 순 삭제 |
| 에러 | 동일 | `RevisionMismatchError`, `SubpageVersionNotFoundError`, `SubpageVersionSlugConflictError` — 각 `code` 상수 노출(`REVISION_MISMATCH`, `VERSION_NOT_FOUND`, `VERSION_SLUG_CONFLICT`) |
| index export | `packages/db/src/index.ts` | 위 헬퍼 + 에러 클래스 + `SubpageVersionSource` enum + `SubpageVersion` type re-export |

**원칙**: `recalculateSubpageContent`는 packages/db에서 호출하지 않음 — packages/editor에 의존하지 않기 위해 admin route handler가 트랜잭션 후 별도 호출 (블록 CUD와 동일 2단계 패턴).

### Phase C: API Routes + rollback revision guard

| Method | Route | 권한 | 핵심 |
|--------|-------|------|------|
| GET | `/api/subpages/[id]/versions` | subpages:read | 필터 (`authorId`, `from`, `to`, `pinnedOnly`, `source`) + 페이지네이션. createdBy join(id/username/name) |
| POST | `/api/subpages/[id]/versions` | subpages:update | body: `{ label? }`, `sourceAction=MANUAL`. **revision guard 없음** (MANUAL 저장은 현재 DB 상태 스냅샷이므로 stale 검사 불필요). 감사 로그: `entityType: SUBPAGE_VERSION`, `action: CREATE`, `changes.after = { versionId, label, sourceAction }` |
| GET | `/api/subpages/[id]/versions/[versionId]` | subpages:read | snapshot 전문 + `findDanglingMediaIds` 결과 포함 |
| PATCH | `/api/subpages/[id]/versions/[versionId]` | subpages:update | body: `{ isPinned }`. no-op short-circuit (기존 값과 동일 시). 감사 로그: `UPDATE` + `{ before: { isPinned }, after: { isPinned } }` |
| DELETE | `/api/subpages/[id]/versions/[versionId]` | subpages:update | **pinned 삭제 시 400** + `"고정된 버전은 삭제할 수 없습니다"`. 감사 로그: `DELETE` |
| POST | `/api/subpages/[id]/versions/[versionId]/rollback` | subpages:update | body: `{ expectedRevision, statusStrategy?, acknowledgeDangling? }`. `restoreSubpageFromVersion` 호출 → `recalculateSubpageContent` → 감사 로그 (`entityType: SUBPAGE`, `action: UPDATE`, `entityTitle` "(롤백)" suffix, `changes.after = { rolledBackFromVersionId, preRollbackVersionId, statusStrategy, newRevision }`). 에러 분기: `RevisionMismatchError` → 409 + `REVISION_MISMATCH`, `SubpageVersionNotFoundError` → 404, `SubpageVersionSlugConflictError` → 409 + `VERSION_SLUG_CONFLICT` |

### Phase D: 기존 Subpage PATCH 감사 로그 drive-by + DTO 확장

| 대상 | 파일 | 변경 |
|------|------|------|
| Subpage DTO | `apps/admin/src/features/subpage-management/model/subpageFilters.ts` | `SubpageDetail`에 `revision: number` 추가 |
| Subpage GET | `apps/admin/app/api/subpages/[id]/route.ts` | 응답 data에 `revision: subpage.revision` 포함 |
| Subpage PATCH | 동일 | **revision guard/`revision++` 적용 안 함** (stale cache로 false positive 반복 발생). audit `changes.before/after`에 `seoTitle`/`seoDescription` 누락 **fix** — drive-by |
| 블록 API 4개 | `apps/admin/app/api/subpages/[id]/blocks/route.ts` + `[blockId]/route.ts` + `reorder/route.ts` | revision guard/`revision++` 적용 안 함 |
| ApiResponse | `packages/types/src/common.types.ts` | `code?: string` 필드 추가 (backward compat) |
| FetchError | `apps/admin/src/shared/api/fetchClient.ts` | `code?: string` 속성 추가 + response body `code` 전파 |

**낙관 동시성 최종 범위**: rollback 엔드포인트 1곳만 `expectedRevision` 수신 + `revision++`. 다른 엔드포인트는 모두 revision 건드리지 않음. `Subpage.revision` 컬럼은 유지 — rollback에서만 증분.

### Phase E: FSD 슬라이스 (api/model/lib)

| 대상 | 파일 | 핵심 |
|------|------|------|
| Fetchers | `apps/admin/src/features/subpage-version/api/versionFetchers.ts` | `getSubpageVersionList/Detail`, `createSubpageVersion`, `updateSubpageVersionPin`, `deleteSubpageVersion`, `rollbackSubpageVersion` |
| Queries | `apps/admin/src/features/subpage-version/api/versionQueries.ts` | `subpageVersionListOptions(subpageId, filters)`, `subpageVersionDetailOptions(subpageId, versionId)`, `recentSubpageVersionsOptions(subpageId)` (최신 5개 별도 캐시 키) |
| Mutations | `apps/admin/src/features/subpage-version/api/useVersionMutations.ts` | `useCreateSubpageVersion`, `useToggleSubpageVersionPin`, `useDeleteSubpageVersion`, `useRollbackSubpageVersion(subpageId, { onSuccess })` — 성공 시 invalidate (subpage detail/lists + block list + version lists/recent). 롤백 훅은 `FetchError.code === 'REVISION_MISMATCH'`일 때 subpage detail invalidate + 토스트 |
| Schemas | `apps/admin/src/features/subpage-version/model/versionSchemas.ts` | `createVersionSchema` (label: optional, max 10000), `rollbackVersionSchema` (expectedRevision nonnegative + statusStrategy enum + acknowledgeDangling optional) |
| Filters | `apps/admin/src/features/subpage-version/model/versionFilters.ts` | `SubpageVersionListFilters` + `DEFAULT_SUBPAGE_VERSION_FILTERS` |
| Labels | `apps/admin/src/features/subpage-version/model/versionLabels.ts` | `SUBPAGE_VERSION_SOURCE_BADGE_VARIANT` (뱃지 색 매핑) + `SUBPAGE_VERSION_FALLBACK_TEXT` (빈 메모 대체 텍스트 — sourceAction별) |
| parseVersionLabel | `apps/admin/src/features/subpage-version/lib/parseVersionLabel.ts` | 정규식 `^([\s\S]*?)\n[ \t]*\n([\s\S]*)$`로 subject+body 분리. subject는 단일 라인(`\s+` → ' ' 치환 + trimEnd). `truncatedSubject` 플래그. `formatVersionSubject(subject)` 72자 + `…` |
| summarizeBlockDiff | `apps/admin/src/features/subpage-version/lib/summarizeBlockDiff.ts` | `displayOrder` 매칭 + `stableStringify(configJson)` JSON 비교로 added/removed/modified/unchanged 집계. key 순서 무시 |
| Query Keys | `apps/admin/src/shared/api/queryKeys.ts` | `subpageVersionKeys.all/lists(subpageId)/list(subpageId, filters)/detail(subpageId, versionId)/recent(subpageId)` |

### Phase F: UI 컴포넌트

| 대상 | 파일 | 핵심 |
|------|------|------|
| SaveVersionButton | `apps/admin/src/features/subpage-version/ui/SaveVersionButton.tsx` | **뷰 페이지 툴바용**. Dialog + Textarea 1개 (≤10,000자, 선택). 깃 스타일 placeholder + 글자 수 카운터. `useDialogDirtyGuard`로 이탈 확인. **함정 회피**: trigger Button `type="button"` 명시 + Dialog form submit 핸들러에서 `e.preventDefault()` + `e.stopPropagation()` + `handleSubmit(...)(e)` — 외부 SubpageForm form으로 이벤트 버블링 차단 |
| RecentVersionsCard | `apps/admin/src/features/subpage-version/ui/RecentVersionsCard.tsx` | SubpageView 우측 컬럼. `useQuery(recentSubpageVersionsOptions)`. 빈 상태 안내 + "전체 이력 보기" 버튼. 메모 있으면 subject 라인 + source 뱃지 + pinned 아이콘 + 작성자/시간. `onViewAll` / `onViewDetail` 콜백 |
| VersionHistoryDialog | `apps/admin/src/features/subpage-version/ui/VersionHistoryDialog.tsx` | 필터(작성자 Select/날짜 범위/소스 Select/pinnedOnly Switch) + 페이지네이션 20 + 액션(상세/복원/핀/삭제). **Base-UI Select 주의**: `<SelectValue />` 대신 `<SelectTrigger><span>{조건부 라벨}</span></SelectTrigger>`로 표시. 작성자 옵션은 현재 페이지 items에서 `createdBy` unique 추출. 삭제 확인은 내부 AlertDialog |
| VersionDetailDialog | `apps/admin/src/features/subpage-version/ui/VersionDetailDialog.tsx` | 최상단 "메모" 섹션 (subject `text-lg font-semibold` + body `<pre className="whitespace-pre-wrap font-sans text-sm">`, label null이면 `SUBPAGE_VERSION_FALLBACK_TEXT` 캡션) → 메타 diff 표 (변경된 필드만 before/after 하이라이트) → `BlockDiffSummary` → `BlockContentView`(스냅샷 블록을 `PageBlockListItem[]` shape로 매핑) → dangling media 경고. 액션: 핀 토글 / 복원 / 닫기 |
| RestoreVersionAlertDialog | `apps/admin/src/features/subpage-version/ui/RestoreVersionAlertDialog.tsx` | Select(KEEP_CURRENT 기본 / APPLY_VERSION) + dangling 체크박스 ack. **내부 query로 version detail 조회** → subject+시간+작성자로 `versionSummary` 구성. **state 초기화는 부모 `key={versionId}` 리마운트**로 처리 (useEffect `setState` 카스케이드 경고 회피) |
| BlockDiffSummary | `apps/admin/src/features/subpage-version/ui/BlockDiffSummary.tsx` | `+추가 N` / `-삭제 N` / `~수정 N` / `· N개 유지` 뱃지. 변경 없음 시 단일 뱃지 |

### Phase G: SubpageView 통합 + Storybook + 테스트

| 대상 | 파일 | 변경 |
|------|------|------|
| SubpageView 툴바 | `apps/admin/src/features/subpage-management/ui/SubpageView.tsx` | 툴바 순서 `[미리보기] [사이트 보기] [SaveVersionButton] [DeleteSubpageDialog] [편집]`. 우측 컬럼에 `RecentVersionsCard`. Dialog state 3종 (`historyOpen`, `detailVersionId`, `rollbackVersionId`). `useRollbackSubpageVersion.onSuccess`에서 **세 state 모두 초기화** (`setRollbackVersionId(null) + setDetailVersionId(null) + setHistoryOpen(false)`) — 복원 결과 즉시 확인 쉽도록. `RestoreVersionAlertDialog`는 `{rollbackVersionId && <... key={rollbackVersionId}>}` 조건부 + key로 리마운트 |
| SubpageForm | `apps/admin/src/features/subpage-management/ui/SubpageForm.tsx` | `SaveVersionButton` 배치 **안 함** (뷰 페이지 전용). `usePermission('subpages','update')` 역시 이 파일에서 사용처가 없다면 제거 |
| parseVersionLabel 테스트 | `apps/admin/src/features/subpage-version/lib/parseVersionLabel.test.ts` | null/빈/공백만/single-line/subject+body/blank line with whitespace/multi-line subject/72자 경계/초과 |
| summarizeBlockDiff 테스트 | `apps/admin/src/features/subpage-version/lib/summarizeBlockDiff.test.ts` | 양쪽 빈 / unchanged / added / removed / blockType 변경 / isVisible 변경 / configJson 변경 / key 순서 무시 / 복합 시나리오 |
| Storybook | `apps/admin/src/features/subpage-version/ui/*.stories.tsx` | `SaveVersionButton` (Idle + OpenSaveSuccessEmptyLabel + OpenSaveSuccessWithMemo play) · `VersionHistoryDialog` (Empty / WithItems) · `VersionDetailDialog` (Minimal / WithMemo / WithDanglingMedia) · `RestoreVersionAlertDialog` (Default / WithDanglingMedia) |

## 검증 (Stage 7f~7j 테스트 인프라 활용)

### 수동 시나리오

1. 편집 → 저장 → 뷰 페이지 이동 → [버전 저장] (메모 비우고) → `sourceAction=MANUAL` 목록 행에 "(메모 없음)" fallback 표시 확인
2. [버전 저장] 메모 `"hero 이미지 교체\n\n- 히어로 신버전\n- 공지 2개"` 입력 → 목록 "hero 이미지 교체" 한 줄만 + [상세] → 상세 최상단에 subject/body 분리 표시 확인
3. 72자 초과 subject 입력 → 목록 truncate + `…` + hover tooltip full subject 확인
4. 미디어 라이브러리에서 이미지 삭제 → 해당 이미지 사용한 과거 버전 Detail 열기 → dangling 경고 → 복원 대화상자에 체크박스 ack 확인
5. `DRAFT → PUBLISHED` 전환 시 `AUTO_PUBLISH` 버전 자동 생성 + 목록에 "발행 전환" 뱃지 표시 확인
6. 블록 reorder 또는 CUD → 버전 생성 **안 됨** 확인
7. 31번째 저장 시 가장 오래된 non-pinned 삭제 + pinned 유지 확인
8. 롤백 성공 시 history/detail/rollback 모달 모두 일괄 close 확인
9. `SaveVersionButton` 클릭 시 "기본 정보가 저장되었습니다" 토스트 **발생 안 함** 확인 (Dialog submit bubbling 방어)

### 자동 검증

```bash
pnpm db:generate && pnpm db:push
pnpm typecheck
pnpm lint
pnpm --filter @simple-cms/admin test
```

## 실수 회피 체크리스트 (실사용 검증 중 발견된 함정)

1. **낙관 동시성 범위 과확장 금지**: rollback **1곳에만** `expectedRevision` guard. 메타 PATCH + 블록 CUD에 guard 적용 시 `staleTime(60s) × Server Component prefetch × Next route cache` 상호작용으로 혼자 작업 시에도 false positive 반복 (React Query cache의 stale revision이 서버 최신값보다 뒤처짐)
2. **Dialog form submit 버블링 차단 필수**: `createPortal`과 무관하게 React 이벤트 버블링은 virtual DOM 기준이라 외부 `<form onSubmit>`까지 도달. trigger `type="button"` + Dialog form submit의 `e.stopPropagation()` 두 방어 함께 적용
3. **Base-UI Select는 `<SelectValue />` 미사용**: value 그대로 표시되는 케이스 회피. `<SelectTrigger><span>{조건부 라벨}</span></SelectTrigger>`로 직접 렌더
4. **Dialog state 초기화는 `key` 리마운트**: `useEffect([open])` 내부 `setState`는 React Compiler `cascading renders` 경고. 부모가 `<Dialog key={id}>`로 리마운트
5. **롤백 성공 시 모달 일괄 close**: detail/history/rollback 세 state 모두 초기화
6. **UI 위치는 뷰 페이지**: 편집 페이지에 두면 "저장 먼저 해야 버전 저장이 된다"는 운영자 혼란. 뷰 페이지가 "현재 DB 상태"라는 맥락에 맞음
7. **블록 snapshot 시 `id` 제외**: 롤백 시 새 cuid 재생성해야 하므로 스냅샷에 기존 id 저장 금지
8. **slug 충돌 검사 트랜잭션 내부에서**: 다른 Subpage가 이미 target slug 차지한 경우 `SubpageVersionSlugConflictError` throw → route handler가 409로 변환
9. **`recalculateSubpageContent`는 트랜잭션 밖에서**: packages/db → packages/editor 의존 회피. 블록 CUD와 동일 2단계 패턴
10. **`findMediaReferences` 확장 금지**: SubpageVersion.snapshot을 Media 참조 추적 대상으로 포함시키면 장기 운영 페이지의 Media 삭제가 사실상 불가능. 대신 `findDanglingMediaIds`로 롤백 시점 경고

## 감사 로그 요약

| 이벤트 | entityType | action | changes |
|--------|------------|--------|---------|
| 수동 버전 저장 | SUBPAGE_VERSION | CREATE | `{ after: { versionId, label, sourceAction: 'MANUAL' } }` |
| 핀 토글 | SUBPAGE_VERSION | UPDATE | `{ before: { isPinned }, after: { isPinned } }` |
| 버전 삭제 | SUBPAGE_VERSION | DELETE | `{ before: { versionId, sourceAction, label } }` |
| 롤백 | SUBPAGE | UPDATE | `entityTitle` "(롤백)" + `{ after: { rolledBackFromVersionId, preRollbackVersionId, statusStrategy, newRevision } }` |
| AUTO_PUBLISH/PRE_ROLLBACK 스냅샷 | — | — | 주 액션의 부수 효과라 별도 AuditLog 기록 안 함. 롤백 자체의 audit에 `preRollbackVersionId` 포함 |
