# Stage 7m — 서브페이지 버전 관리 (이력 / 롤백 / 작성자 필터 · admin 미리보기)

서브페이지의 변경 이력 추적 + 롤백 + 작성자별 히스토리 조회 기능을 `SubpageVersion` 단일 JSON 스냅샷 테이블 + admin 전용 미리보기로 도입. 감사 로그(이벤트 로깅) vs 버전 스냅샷(상태 복원)의 역할 분리 — `AuditLog.changes`는 메타만 저장해 본문 복원이 불가능했던 gap을 해소.

- **스키마 (마이그레이션 `pnpm db:push` 완료)**: `Subpage.revision Int @default(0)` 낙관 동시성 + `SubpageVersion { id, subpageId, createdById, createdAt, label?, snapshot Json, isPinned, sourceAction SubpageVersionSource }` + enum `SubpageVersionSource { MANUAL | AUTO_PUBLISH | PRE_ROLLBACK }` + `AuditEntityType.SUBPAGE_VERSION` + `User.subpageVersions` 역관계. 인덱스 `(subpageId, createdAt)` / `createdById` / `isPinned`
- **DB 헬퍼** (`packages/db/src/subpageVersion.ts`): `createSubpageVersionSnapshot` (retention cleanup 포함), `restoreSubpageFromVersion` (트랜잭션 내 PRE_ROLLBACK 자동 백업 → slug 충돌 검사 → meta 덮어쓰기 → blocks 재생성 → revision++), `findDanglingMediaIds` (IMAGE 블록 `imageMediaId` + RICH_TEXT Tiptap image 노드 `attrs.mediaId` 재귀 수집 후 차집합), `RevisionMismatchError` / `SubpageVersionNotFoundError` / `SubpageVersionSlugConflictError` 커스텀 에러. 보존 정책: `isPinned=false` 30개 상한 + lazy cleanup (cron 없음, save handler 내에서 오래된 것부터 삭제)
- **감사 로그 vs 스냅샷 역할 분리**: AuditLog는 계속 "누가·언제·어떤 액션"만 담당. SubpageVersion은 "그 시점의 콘텐츠가 정확히 무엇"을 담당. `PageBlock.configJson`(실제 본문)은 AuditLog.changes에 저장되지 않아 롤백 불가 — Stage 6 통합 블록 모델 이후 이 gap이 잠재해 있었음
- **저장 트리거** (3가지만, 의미 있는 체크포인트):
  - MANUAL: 편집 페이지 상단 [버전 저장] 버튼 (`SaveVersionButton` · 메모 Dialog)
  - AUTO_PUBLISH: `/api/subpages/[id]` PATCH에서 DRAFT→PUBLISHED 전환 시 서버가 자동 생성 (try/catch, 주 액션 차단 안 함)
  - PRE_ROLLBACK: 롤백 직전 현재 상태를 자동 백업 (label=null, 시스템 맥락은 sourceAction으로 파생)
  - **블록 reorder는 버전 생성 안 함** — 순서만 바뀌는 케이스 노이즈 회피 (`/api/subpages/[id]/blocks/reorder` 주석 명시). 블록 CUD도 개별 버전을 만들지 않음 — 명시적 [버전 저장]만 MANUAL로 축적
- **메모 구조 — 깃 커밋 스타일 단일 Textarea** (사용자 결정): `label String? @db.Text` 단일 필드(최대 10,000자). `parseVersionLabel(label)`이 첫 번째 빈 줄(`\n\s*\n`) 기준으로 subject + body 분리. 목록은 `subject` 72자까지 truncate (`…` + hover tooltip full), 상세는 최상단 "메모" 섹션에 subject(큰 글씨) + body(`<pre className="whitespace-pre-wrap">`). 메모 비우고 저장 가능 — 빈 메모는 `sourceAction` 뱃지 기반 fallback 텍스트로 표시 ("(메모 없음)" / "발행 전환 자동 저장" / "다른 버전으로 복원 직전 자동 저장")
- **낙관 동시성** (`Subpage.revision`): **rollback 엔드포인트 1곳에서만** `expectedRevision` 수신 → 불일치 시 409 `{ code: 'REVISION_MISMATCH' }`. 메타 PATCH와 블록 CUD/reorder는 revision을 건드리지 않음 — 실사용 검증 중 발견: React Query `staleTime: 60s` + Server Component prefetch + React Query client cache가 상호작용해 SubpageForm의 stale `initialData.revision`이 혼자 작업 시에도 반복 409를 유발. 사용자 UX 우선으로 메타 저장에서도 guard 제거. rollback은 본질적으로 파괴적 액션이라 보호 유지. `Subpage.revision` 컬럼은 rollback 호출 시에만 증분 (`restoreSubpageFromVersion` 트랜잭션 내). `ApiResponse<T>`에 `code?: string` 옵션 추가 (backward compat)
- **API Routes (신규 6개)**: `GET/POST /api/subpages/[id]/versions` (목록+생성), `GET/PATCH/DELETE /api/subpages/[id]/versions/[versionId]` (상세/pin 토글/삭제), `POST /api/subpages/[id]/versions/[versionId]/rollback`. 모두 `requirePermission('subpages', <action>)` — 별도 리소스 신설 안 함 (seed/role migration 부담 회피). pinned 버전 DELETE 시 400
- **UI 컴포넌트 (신규 6개)**: `SaveVersionButton` (**뷰 페이지 상단 툴바** — 편집이 아닌 "현재 DB 상태를 스냅샷"이라는 의미에 맞춤) / `VersionHistoryDialog` (전체 이력 · 작성자·날짜·소스·pinned 필터 + 페이지네이션 + 상세/복원/핀/삭제 액션) / `VersionDetailDialog` (메모 → 메타 diff → `BlockDiffSummary` → `BlockContentView` 재사용 → dangling media 경고) / `RestoreVersionAlertDialog` (상태 전략 Select: `KEEP_CURRENT` 기본 / `APPLY_VERSION` 옵션 + dangling 체크박스 ack) / `RecentVersionsCard` (SubpageView 우측 최근 5개 + "전체 이력 보기") / `BlockDiffSummary` (+추가/-삭제/~수정 뱃지)
- **UI 구성 경험칙** (구현 중 발견):
  - **Dialog form submit이 외부 `<form>`으로 버블링**: SaveVersionButton trigger 버튼에 `type="button"` 명시 + Dialog 내부 form submit에서 `e.stopPropagation()`. React 이벤트 버블링은 `createPortal`과 무관하게 virtual DOM 기준이라 Dialog 내 submit이 외부 SubpageForm의 onSubmit까지 도달. 같은 클릭에 "버전이 저장되었습니다" + "기본 정보가 저장되었습니다" 두 토스트가 뜨는 증상으로 발견
  - **Base-UI Select의 `<SelectValue />` 미사용**: Trigger 내부에 `<span>{조건부 라벨}</span>` 직접 렌더. `<SelectValue />`가 value(`KEEP_CURRENT` 등)를 그대로 노출하는 케이스 회피 — 기존 `SubpageForm`의 Select 사용 패턴과 일관
  - **롤백 성공 시 모달 일괄 close**: `useRollbackSubpageVersion.onSuccess`에서 `setRollbackVersionId(null) + setDetailVersionId(null) + setHistoryOpen(false)` 모두 호출. 운영자가 복원 결과를 즉시 확인하기 쉽도록
  - **`useEffect`에서 `setState` 카스케이드 회피**: RestoreVersionAlertDialog가 open일 때 상태 초기화하던 `useEffect([open])`가 React Compiler ESLint 경고 발생 → 제거하고 **부모에서 `key={rollbackVersionId}`로 리마운트**시켜 useState 기본값으로 자연 초기화
- **BlockContentView 재사용** (advisor sanity check 통과): props `blocks: PageBlockListItem[]` plain shape이라 스냅샷 `blocks` 배열을 `snapshotBlockToListItem`으로 매핑하면 그대로 재사용. refactor 불필요
- **메타 diff는 단순 표** (Tiptap word-level diff 회피): 9개 메타 필드(title/slug/seoTitle/seoDescription/status/cclType/cclAi/featuredImageId/displayOrder) before/after 비교 표, 변경된 행만 표시. 블록 diff는 `displayOrder` 기준 매칭 + `stableStringify` JSON 비교로 added/removed/modified/unchanged 집계
- **Media 참조 추적 정책** (advisor 권장 option 2): `findMediaReferences()` 확장 **안 함** — 확장 시 장기 운영 Subpage의 Media 삭제가 사실상 불가능. 대신 `findDanglingMediaIds(snapshot)` 헬퍼가 롤백 시점에 누락된 미디어를 감지해 UI에 경고 + 체크박스 ack 후 롤백 허용 (깨진 이미지 참조는 표시만 안 됨, 복원 자체는 진행)
- **Drive-by fix**: `/api/subpages/[id]` PATCH의 audit `changes.before/after`가 기존에 `title/slug/status/cclType/cclAi` 5필드만 기록하던 gap 해소 — `seoTitle`, `seoDescription` 추가 (기존 코드에서 누락되어 있던 것을 Stage 7m 변경 시 같은 커밋에 정리)
- **Storybook + 테스트**: `parseVersionLabel.test.ts` (10 cases) + `summarizeBlockDiff.test.ts` (8 cases) 단위 테스트. `SaveVersionButton.stories` 3 variants (Idle / OpenSaveSuccessEmptyLabel / OpenSaveSuccessWithMemo) — 후자 2개는 fetch stub 201 + play function으로 메모 입력 → 저장 → 토스트 assert. `VersionHistoryDialog` 2 variants (Empty / WithItems), `VersionDetailDialog` 3 variants (Minimal / WithMemo / WithDanglingMedia), `RestoreVersionAlertDialog` 2 variants. 루트 `pnpm test`: **admin 25 files / 90 tests** (60 → +30)
- **Stage 7m이 하지 않은 것** (Out of Scope → Stage 7n 이후):
  - Web 공개 웹(`apps/web`) 과거 버전 KRDS 스타일 렌더 미리보기 (`PreviewToken.entityType=SUBPAGE_VERSION` + web preview 경로 확장 + slug/chrome 시간여행 설계 포함) — **Stage 7n 분리 예약**
  - Tiptap ProseMirror JSON word-level diff 뷰어
  - 두 버전 2-up side-by-side 비교
  - Post / HomePopup 버전 관리 (동일 패턴 복제)
  - 버전 목록 Excel export
  - debounced 자동 저장 (세션 단위)
- 상세 계획: [`C:/Users/ddock/.claude/plans/modular-singing-toast.md`](../../../Users/ddock/.claude/plans/modular-singing-toast.md)
