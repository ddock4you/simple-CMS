# Stage 13 — DnD Staged Save

드래그&드롭 순서 변경을 "drop 즉시 서버 저장" 패턴에서 "클라이언트 staged 보관 → 명시적 [순서 저장] 버튼으로 commit" 패턴으로 전환. admin 4개 화면 전체 적용.

## 변경 동기

기존 구조에서는 카드를 1픽셀만 드래그해도 즉시 PATCH가 서버에 반영되고 audit log까지 남았다. 다인 운영 환경에서 실수로 인한 순서 뒤바뀜이 공개 웹 메뉴·메인·서브페이지 본문 구성에 직접 영향을 주는 위험이 있었다.

## 핵심 아키텍처 결정

- **staged state 단일 진실 출처**: `useStagedOrder` 훅이 `staged: T[] | null`을 관리. staged가 있으면 표시에 사용, 없으면 서버 데이터(displayOrder 정렬).
- **onMutate 캐시 패치 제거**: 기존 4개 `useReorder*` 훅의 optimistic update(`onMutate` + `onError` rollback) 전부 삭제. staged state가 이 역할을 흡수.
- **두 버튼 always-visible**: `[되돌리기]` `[순서 저장]` 항상 헤더에 노출, dirty 아닐 때 disabled. sticky bar 아님.
- **즉시 반영 유지**: visibility 토글·메타 수정은 여전히 즉시 PATCH. staged와 공존 (`useEffect` merge 정책).

## 단계별 변경 내역

### Stage 13a — 공통 인프라

**신설 파일 3개:**

- `apps/admin/src/shared/lib/useStagedOrder.ts` — 핵심 훅. list/tree 모드, `getDirtyPayload()` 평탄화, `useEffect` 기반 data 변경 동기화 (같은 id 집합이면 비-순서 필드 merge, 다르면 `idSetChanged=true`), 자기 무효화 (drag 후 원위치 → `staged=null` 자동).
- `apps/admin/src/shared/ui/OrderActionButtons.tsx` — `[되돌리기]` `[순서 저장]` + dirty count 배지. dirty 아닐 때 disabled, 저장 중 Spinner.
- `apps/admin/src/shared/lib/useStagedOrder.test.ts` — list/tree applyDragEnd, getDirtyPayload, syncIfIdSetChanged 3분기, reset, dirtyCount unit 132건.

**단계별 구현 원칙:**
- `getDirtyPayload()`: displayOrder = staged 배열 인덱스(0부터). 기존 reorder 호출 `map((b, i) => ({ id: b.id, displayOrder: i }))` 패턴 그대로.
- tree 모드 `getDirtyPayload()`: `flattenTree(staged, getId, getChildren)` 평탄화 후 `groupIndex` → `displayOrder`.

### Stage 13b — HomeSection 적용

**변경 파일:**
- `apps/admin/src/features/home-management/ui/SectionList.tsx` — `useStagedOrder(mode:'list')` + `useDirtyGuard` + `OrderActionButtons`. handleDragEnd → `applyDragEnd`. handleSave에서 per-call `mutate(data, { onSuccess, onError })`.
- `apps/admin/src/features/home-management/api/useHomeMutations.ts` — `useReorderHomeSections`에서 `onMutate`/`onError` rollback/`onSettled` 제거, `mutationFn`만 유지.
- `apps/admin/src/features/home-management/ui/SectionReorderProbe.stories.tsx` — 삭제 (optimistic rollback 시나리오가 staged 모델로 흡수됨).

6개 고정 HomeSection은 id 집합 변동이 없어 인라인 배너 분기 불필요. 가장 단순한 케이스로 정상 경로 검증.

### Stage 13c — HomePopup 적용

**변경 파일:**
- `apps/admin/src/features/popup-management/ui/PopupList.tsx` — `useQuery` 결과 `data ?? []`를 `useStagedOrder`에 전달 (undefined 안전). `useDirtyGuard` + `OrderActionButtons` + `ConfirmLeaveDialog`.
- `apps/admin/src/features/popup-management/api/usePopupMutations.ts` — `useReorderHomePopups` 단순화. `useToggleHomePopupVisibility`의 optimistic update는 별도 mutation이라 변경 없음.

visibility 토글(즉시 PATCH) + staged 순서 변경이 공존하는 첫 검증 케이스. `useEffect` merge 정책으로 토글 후에도 staged 유지 확인.

### Stage 13d — PageBlock 적용

**변경 파일:**
- `apps/admin/src/features/block-management/ui/BlockManager.tsx` — `useStagedOrder(mode:'list')` + `useDirtyGuard` + `OrderActionButtons`. 헤더 재구성: `[되돌리기] [순서 저장]` + `[블록 추가]` 드롭다운 같은 행. 안내 문구 "변경 즉시 저장됩니다." → "블록 추가·편집·삭제는 즉시 저장됩니다. 순서는 [순서 저장] 버튼을 사용하세요."
- `apps/admin/src/features/block-management/api/useBlockMutations.ts` — `useReorderBlocks` 단순화.

**두 가드 공존 패턴 (SubpageForm + BlockManager):**
서브페이지 편집 페이지에 SubpageForm의 `useDirtyGuard(formDirty)`와 BlockManager의 `useDirtyGuard(stagedOrderDirty)`가 독립적으로 공존. `useDirtyGuard` 구현이 링크 클릭 시 `e.defaultPrevented` 체크로 첫 번째 등록 가드만 처리하도록 설계되어 있어 이중 dialog 없음. 별도 OR 결합이나 상태 리프팅 불필요.

### Stage 13e — NavigationMenuItem 적용 + reorder API 트랜잭션 fix

**Commit 1 — 트랜잭션 fix:**
- `apps/admin/app/api/navigation/[menuId]/reorder/route.ts` — 순차 `for` 루프(줄 52~57) → `await prisma.$transaction(items.map(...))`. 부분 실패 시 일부 항목만 갱신되는 non-atomic 상태 방지.

**Commit 2 — staged save:**
- `apps/admin/src/features/navigation-management/ui/MenuItemTree.tsx` — `useStagedOrder(mode:'tree', getChildren, setChildren)`. `handleDragEnd`에서 기존 직접 `reorderMutation.mutate` → `applyTreeDragEnd({ parentId, activeId, overId })`. handleSave 추가. `useDirtyGuard` + `OrderActionButtons` + `ConfirmLeaveDialog`. `findItem` 헬퍼 삭제 (더 이상 불필요).
- `apps/admin/src/features/navigation-management/api/useNavigationMutations.ts` — `useReorderItems`에서 `ReorderTreeNode` 인터페이스, `applyReorderToTree` 함수, `onMutate`/`onError` rollback/`onSettled` 제거. `mutationFn`만 유지.

**tree 모드 특이사항:**
- `applyTreeDragEnd`가 `parentId !== null` 분기를 내부에서 처리하므로 컴포넌트에서는 `findParentId`로 activeParent === overParent 동일성만 확인 후 no-op early return.
- `setChildren: (n, children) => ({ ...n, children })` — immutable 업데이트.
- `getDirtyPayload()` tree 평탄화: 각 부모 그룹 내 `groupIndex`가 새 `displayOrder`. 서버 reorder API가 받는 `{ id, displayOrder }[]` 형식 그대로.

## 테스트 결과

- unit: 132 passed (11 files) — `useStagedOrder` 핵심 로직 포함
- typecheck: 0 errors
- lint: 0 errors (기존 warning 8건은 pre-existing)

## 변경 패턴 요약

| 훅 | 변경 전 | 변경 후 |
|---|---|---|
| `useReorderHomeSections` | onMutate + applyReorderToTree + onError rollback + onSettled | mutationFn only |
| `useReorderHomePopups` | onMutate + onError rollback + onSettled | mutationFn only |
| `useReorderBlocks` | onMutate + onError rollback + onSettled | mutationFn only |
| `useReorderItems` | onMutate + applyReorderToTree + onError rollback + onSettled | mutationFn only |

handleSave 패턴 (4개 공통):
```typescript
reorderMutation.mutate(
  { [key]: getDirtyPayload() },
  {
    onSuccess: () => {
      reset();
      queryClient.invalidateQueries({ queryKey: ... });
      toast.success('순서가 저장되었습니다.');
    },
    onError: (error) => { toast.error(error.message); },
  },
);
```

## Out of Scope (Stage 14 후보)

- staged 중 id 집합 변경(추가/삭제) 시 인라인 배너 (`idSetChanged` 상태는 구현됨, UI 배너는 미연결)
- sessionStorage 백업 (브라우저 강제 종료 대비)
- HomeSection length(6) 하드코딩 해소
