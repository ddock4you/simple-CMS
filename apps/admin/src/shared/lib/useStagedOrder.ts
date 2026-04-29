'use client';

import { useEffect, useRef, useState } from 'react';

type Mode = 'list' | 'tree';

export interface StagedOrderInput<T extends { id: string }> {
  data: T[];
  mode: Mode;
  getId: (t: T) => string;
  getOrder: (t: T) => number;
  /** tree 모드에서 항목의 자식 배열을 반환. */
  getChildren?: (t: T) => T[];
  /** tree 모드에서 항목의 자식을 교체한 새 항목을 반환 (immutable 업데이트용). */
  setChildren?: (item: T, children: T[]) => T;
}

export interface StagedOrderResult<T extends { id: string }> {
  /** staged가 있으면 staged, 없으면 data (displayOrder 정렬). */
  items: T[];
  isDirty: boolean;
  /** staged 내에서 원본 displayOrder와 다른 위치에 있는 항목 수. */
  dirtyCount: number;
  /** data의 id 집합이 staged의 id 집합과 달라졌을 때 true (항목 추가·삭제 감지). */
  idSetChanged: boolean;
  applyDragEnd: (activeId: string, overId: string) => void;
  applyTreeDragEnd: (args: {
    parentId: string | null;
    activeId: string;
    overId: string;
  }) => void;
  reset: () => void;
  /** idSetChanged 시 staged 유지: 누락된 id 제거 + 추가된 id 끝에 추가. */
  keepStaged: () => void;
  /** staged 배열의 각 항목에 displayOrder = 배열 인덱스를 할당해 반환. tree는 평탄화. */
  getDirtyPayload: () => { id: string; displayOrder: number }[];
}

/** 배열에서 from 위치 항목을 to 위치로 이동한 새 배열 반환. */
export function moveItem<T>(arr: T[], from: number, to: number): T[] {
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** 중첩 트리를 평탄화해 { id, groupIndex, parentId }[] 반환. groupIndex = 부모 그룹 내 인덱스. */
export function flattenTree<T extends { id: string }>(
  items: T[],
  getId: (t: T) => string,
  getChildren: (t: T) => T[],
  parentId: string | null = null,
): { id: string; groupIndex: number; parentId: string | null }[] {
  const result: { id: string; groupIndex: number; parentId: string | null }[] =
    [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const id = getId(item);
    result.push({ id, groupIndex: i, parentId });
    const children = getChildren(item);
    if (children.length > 0) {
      result.push(...flattenTree(children, getId, getChildren, id));
    }
  }
  return result;
}

/** list 모드: staged 순서가 data(displayOrder 정렬) 순서와 동일한지 비교. */
export function isListSameAsData<T extends { id: string }>(
  staged: T[],
  data: T[],
  getId: (t: T) => string,
  getOrder: (t: T) => number,
): boolean {
  const sorted = [...data].sort((a, b) => getOrder(a) - getOrder(b));
  if (staged.length !== sorted.length) return false;
  return staged.every((item, i) => getId(item) === getId(sorted[i]));
}

/** tree 모드: 각 부모 그룹 내 순서가 data와 동일한지 재귀 비교. */
export function isTreeSameAsData<T extends { id: string }>(
  staged: T[],
  data: T[],
  getId: (t: T) => string,
  getOrder: (t: T) => number,
  getChildren: (t: T) => T[],
): boolean {
  const sortedData = [...data].sort((a, b) => getOrder(a) - getOrder(b));
  if (staged.length !== sortedData.length) return false;
  if (!staged.every((item, i) => getId(item) === getId(sortedData[i]))) {
    return false;
  }
  for (const stagedItem of staged) {
    const dataItem = sortedData.find((d) => getId(d) === getId(stagedItem));
    if (!dataItem) return false;
    const sc = getChildren(stagedItem);
    const dc = getChildren(dataItem);
    if (!isTreeSameAsData(sc, dc, getId, getOrder, getChildren)) return false;
  }
  return true;
}

/** 트리 내 특정 부모의 children을 재귀적으로 찾아 재정렬한 새 트리 반환. 변경 없으면 동일 참조 반환. */
export function reorderInTree<T extends { id: string }>(
  tree: T[],
  parentId: string | null,
  activeId: string,
  overId: string,
  getId: (t: T) => string,
  getChildren: (t: T) => T[],
  setChildren: (item: T, children: T[]) => T,
): T[] {
  if (parentId === null) {
    const oldIdx = tree.findIndex((i) => getId(i) === activeId);
    const newIdx = tree.findIndex((i) => getId(i) === overId);
    if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return tree;
    return moveItem(tree, oldIdx, newIdx);
  }

  let changed = false;
  const result = tree.map((item) => {
    if (getId(item) === parentId) {
      const children = getChildren(item);
      const oldIdx = children.findIndex((c) => getId(c) === activeId);
      const newIdx = children.findIndex((c) => getId(c) === overId);
      if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return item;
      changed = true;
      return setChildren(item, moveItem(children, oldIdx, newIdx));
    }
    const children = getChildren(item);
    const updatedChildren = reorderInTree(
      children,
      parentId,
      activeId,
      overId,
      getId,
      getChildren,
      setChildren,
    );
    if (updatedChildren === children) return item;
    changed = true;
    return setChildren(item, updatedChildren);
  });
  return changed ? result : tree;
}

/** 트리 staged를 data의 최신 필드값으로 머지 (staged 순서 보존). */
function mergeTreeWithData<T extends { id: string }>(
  staged: T[],
  data: T[],
  getId: (t: T) => string,
  getChildren: (t: T) => T[],
  setChildren: (item: T, children: T[]) => T,
): T[] {
  const dataMap = new Map<string, T>();
  function index(items: T[]) {
    for (const item of items) {
      dataMap.set(getId(item), item);
      index(getChildren(item));
    }
  }
  index(data);

  function merge(stagedItems: T[]): T[] {
    return stagedItems.map((s) => {
      const d = dataMap.get(getId(s));
      if (!d) return s;
      const sc = getChildren(s);
      return setChildren(d, sc.length > 0 ? merge(sc) : sc);
    });
  }
  return merge(staged);
}

export function useStagedOrder<T extends { id: string }>({
  data,
  mode,
  getId,
  getOrder,
  getChildren,
  setChildren,
}: StagedOrderInput<T>): StagedOrderResult<T> {
  const [staged, setStaged] = useState<T[] | null>(null);
  const [idSetChanged, setIdSetChanged] = useState(false);

  // 최신 값을 effect 내에서 읽을 수 있도록 ref로 보관
  const stagedRef = useRef<T[] | null>(staged);
  stagedRef.current = staged;

  const getIdRef = useRef(getId);
  getIdRef.current = getId;
  const getOrderRef = useRef(getOrder);
  getOrderRef.current = getOrder;
  const getChildrenRef = useRef(getChildren);
  getChildrenRef.current = getChildren;
  const setChildrenRef = useRef(setChildren);
  setChildrenRef.current = setChildren;

  // data가 변경될 때 staged 동기화 (staged가 활성 상태인 경우에만)
  useEffect(() => {
    const prev = stagedRef.current;
    if (!prev) return;

    const gc = getChildrenRef.current;
    const sc = setChildrenRef.current;
    const gid = getIdRef.current;

    if (mode === 'list') {
      const dataIds = new Set(data.map(gid));
      const stagedIds = new Set(prev.map(gid));
      const sameIdSet =
        dataIds.size === stagedIds.size &&
        [...stagedIds].every((id) => dataIds.has(id));

      if (!sameIdSet) {
        setIdSetChanged(true);
        return;
      }
      // 같은 id 집합 → 비-순서 필드를 data 최신값으로 merge, staged 순서 보존
      const dataMap = new Map(data.map((item) => [gid(item), item]));
      setStaged(prev.map((item) => dataMap.get(gid(item)) ?? item));
    } else if (mode === 'tree' && gc && sc) {
      const stagedFlat = flattenTree(prev, gid, gc);
      const dataFlat = flattenTree(data, gid, gc);
      const dataIdSet = new Set(dataFlat.map((f) => f.id));
      const stagedIdSet = new Set(stagedFlat.map((f) => f.id));
      const sameIdSet =
        dataIdSet.size === stagedIdSet.size &&
        [...stagedIdSet].every((id) => dataIdSet.has(id));

      if (!sameIdSet) {
        setIdSetChanged(true);
        return;
      }
      setStaged(mergeTreeWithData(prev, data, gid, gc, sc));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const dataOrdered = [...data].sort((a, b) => getOrder(a) - getOrder(b));

  const items = staged ?? dataOrdered;
  const isDirty = staged !== null;

  let dirtyCount = 0;
  if (staged) {
    if (mode === 'list') {
      const posMap = new Map(dataOrdered.map((item, i) => [getId(item), i]));
      dirtyCount = staged.filter(
        (item, i) => posMap.get(getId(item)) !== i,
      ).length;
    } else if (getChildren) {
      const stagedFlat = flattenTree(staged, getId, getChildren);
      const dataFlat = flattenTree(data, getId, getChildren);
      const dataPosMap = new Map(dataFlat.map((f) => [f.id, f.groupIndex]));
      dirtyCount = stagedFlat.filter(
        (f) => dataPosMap.get(f.id) !== f.groupIndex,
      ).length;
    }
  }

  const applyDragEnd = (activeId: string, overId: string) => {
    if (mode !== 'list') return;
    const base = staged ?? dataOrdered;
    const oldIdx = base.findIndex((item) => getId(item) === activeId);
    const newIdx = base.findIndex((item) => getId(item) === overId);
    if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return;

    const next = moveItem(base, oldIdx, newIdx);
    if (isListSameAsData(next, data, getId, getOrder)) {
      setStaged(null);
      return;
    }
    setStaged(next);
  };

  const applyTreeDragEnd = ({
    parentId,
    activeId,
    overId,
  }: {
    parentId: string | null;
    activeId: string;
    overId: string;
  }) => {
    if (mode !== 'tree' || !getChildren || !setChildren) return;
    const base = staged ?? dataOrdered;
    const next = reorderInTree(
      base,
      parentId,
      activeId,
      overId,
      getId,
      getChildren,
      setChildren,
    );
    if (next === base) return;
    if (isTreeSameAsData(next, data, getId, getOrder, getChildren)) {
      setStaged(null);
      return;
    }
    setStaged(next);
  };

  const reset = () => {
    setStaged(null);
    setIdSetChanged(false);
  };

  const keepStaged = () => {
    setStaged((prev) => {
      if (!prev) return null;
      if (mode !== 'list') return prev;
      const dataById = new Map(data.map((item) => [getId(item), item]));
      const stagedIdSet = new Set(prev.map(getId));
      const filtered = prev.filter((item) => dataById.has(getId(item)));
      const newItems = [...data]
        .sort((a, b) => getOrder(a) - getOrder(b))
        .filter((item) => !stagedIdSet.has(getId(item)));
      return [...filtered, ...newItems];
    });
    setIdSetChanged(false);
  };

  const getDirtyPayload = (): { id: string; displayOrder: number }[] => {
    if (!staged) return [];

    if (mode === 'list') {
      return staged.map((item, i) => ({ id: getId(item), displayOrder: i }));
    }

    if (getChildren) {
      return flattenTree(staged, getId, getChildren).map(
        ({ id, groupIndex }) => ({ id, displayOrder: groupIndex }),
      );
    }

    return [];
  };

  return {
    items,
    isDirty,
    dirtyCount,
    idSetChanged,
    applyDragEnd,
    applyTreeDragEnd,
    reset,
    keepStaged,
    getDirtyPayload,
  };
}
