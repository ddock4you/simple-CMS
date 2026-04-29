'use client';

import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { useStagedOrder } from '@/shared/lib/useStagedOrder';

// ─── List 모드 픽스처 ────────────────────────────────────────────────────────

type Item = { id: string; displayOrder: number; label: string };

const getId = (t: Item) => t.id;
const getOrder = (t: Item) => t.displayOrder;

const INITIAL_DATA: Item[] = [
  { id: 'a', displayOrder: 0, label: 'A' },
  { id: 'b', displayOrder: 1, label: 'B' },
  { id: 'c', displayOrder: 2, label: 'C' },
];

const SAME_IDS_UPDATED: Item[] = [
  { id: 'a', displayOrder: 0, label: 'A_NEW' },
  { id: 'b', displayOrder: 1, label: 'B_NEW' },
  { id: 'c', displayOrder: 2, label: 'C_NEW' },
];

const DIFFERENT_IDS_UPDATED: Item[] = [
  { id: 'a', displayOrder: 0, label: 'a' },
  { id: 'b', displayOrder: 1, label: 'b' },
  { id: 'd', displayOrder: 2, label: 'd' }, // c 제거, d 추가
];

// ─── List 모드 Probe ─────────────────────────────────────────────────────────

/**
 * `useStagedOrder` list 모드 훅의 상태를 DOM에 노출하는 probe.
 *
 * 버튼으로 applyDragEnd / 데이터 교체 / keepStaged / reset 을 트리거하고,
 * play function에서 data-testid로 결과를 검증한다.
 */
function ListStagedOrderProbe() {
  const [data, setData] = useState<Item[]>(INITIAL_DATA);

  const { items, isDirty, dirtyCount, idSetChanged, applyDragEnd, keepStaged, reset } =
    useStagedOrder({ data, mode: 'list', getId, getOrder });

  return (
    <div className="space-y-4 p-4 font-mono text-sm">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="drag-a-to-c"
          className="rounded bg-primary px-3 py-1 text-xs text-primary-foreground"
          onClick={() => applyDragEnd('a', 'c')}
        >
          drag a → c
        </button>
        <button
          type="button"
          data-testid="update-same-ids"
          className="rounded bg-secondary px-3 py-1 text-xs text-secondary-foreground"
          onClick={() => setData(SAME_IDS_UPDATED)}
        >
          data 갱신 (같은 id)
        </button>
        <button
          type="button"
          data-testid="update-different-ids"
          className="rounded bg-secondary px-3 py-1 text-xs text-secondary-foreground"
          onClick={() => setData(DIFFERENT_IDS_UPDATED)}
        >
          data 갱신 (다른 id)
        </button>
        <button
          type="button"
          data-testid="keep-staged"
          className="rounded border px-3 py-1 text-xs"
          onClick={() => keepStaged()}
        >
          keepStaged
        </button>
        <button
          type="button"
          data-testid="reset-btn"
          className="rounded border px-3 py-1 text-xs"
          onClick={() => reset()}
        >
          reset
        </button>
      </div>

      <div className="space-y-1">
        <p data-testid="is-dirty">isDirty:{isDirty ? 'true' : 'false'}</p>
        <p data-testid="dirty-count">dirtyCount:{dirtyCount}</p>
        <p data-testid="id-set-changed">idSetChanged:{idSetChanged ? 'true' : 'false'}</p>
      </div>

      <ul data-testid="items-list" className="space-y-1 rounded border p-2">
        {items.map((item) => (
          <li key={item.id} data-testid={`item-${item.id}`}>
            {item.id}:{item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Tree 모드 픽스처 ────────────────────────────────────────────────────────

type TreeNode = { id: string; displayOrder: number; label: string; children: TreeNode[] };

const getTreeId = (n: TreeNode) => n.id;
const getTreeOrder = (n: TreeNode) => n.displayOrder;
const getTreeChildren = (n: TreeNode) => n.children;
const setTreeChildren = (n: TreeNode, children: TreeNode[]): TreeNode => ({ ...n, children });

const TREE_DATA: TreeNode[] = [
  {
    id: 'root1',
    displayOrder: 0,
    label: 'Root1',
    children: [
      { id: 'c1', displayOrder: 0, label: 'C1', children: [] },
      { id: 'c2', displayOrder: 1, label: 'C2', children: [] },
      { id: 'c3', displayOrder: 2, label: 'C3', children: [] },
    ],
  },
  { id: 'root2', displayOrder: 1, label: 'Root2', children: [] },
];

function TreeStagedOrderProbe() {
  const { items, isDirty, dirtyCount, applyTreeDragEnd, reset } = useStagedOrder({
    data: TREE_DATA,
    mode: 'tree',
    getId: getTreeId,
    getOrder: getTreeOrder,
    getChildren: getTreeChildren,
    setChildren: setTreeChildren,
  });

  const root1 = items.find((n) => getTreeId(n) === 'root1');

  return (
    <div className="space-y-4 p-4 font-mono text-sm">
      <div className="flex gap-2">
        <button
          type="button"
          data-testid="tree-drag-c3-to-c1"
          className="rounded bg-primary px-3 py-1 text-xs text-primary-foreground"
          onClick={() =>
            applyTreeDragEnd({ parentId: 'root1', activeId: 'c3', overId: 'c1' })
          }
        >
          root1 내: c3 → c1 위치로
        </button>
        <button
          type="button"
          data-testid="tree-reset"
          className="rounded border px-3 py-1 text-xs"
          onClick={() => reset()}
        >
          reset
        </button>
      </div>

      <div className="space-y-1">
        <p data-testid="tree-is-dirty">isDirty:{isDirty ? 'true' : 'false'}</p>
        <p data-testid="tree-dirty-count">dirtyCount:{dirtyCount}</p>
      </div>

      <ul data-testid="tree-root1-children" className="space-y-1 rounded border p-2">
        {root1?.children.map((child) => (
          <li key={child.id} data-testid={`tree-child-${child.id}`}>
            {child.id}:{child.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Meta ────────────────────────────────────────────────────────────────────

const meta = {
  title: 'Admin/Shared/StagedOrderProbe',
  component: ListStagedOrderProbe,
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof ListStagedOrderProbe>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── List 모드 stories ───────────────────────────────────────────────────────

/** 초기 상태 — isDirty=false, 원본 순서 [a,b,c] */
export const ListIdle: Story = {};

/** drag a→c → isDirty=true, 순서 [b,c,a] (분기 1: drag 자체) */
export const ListDragAndDirty: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByTestId('is-dirty')).toHaveTextContent('isDirty:false');

    await userEvent.click(canvas.getByTestId('drag-a-to-c'));

    await expect(canvas.getByTestId('is-dirty')).toHaveTextContent('isDirty:true');
    await expect(canvas.getByTestId('dirty-count')).toHaveTextContent('dirtyCount:3');

    // items 순서: b, c, a
    const listItems = within(canvas.getByTestId('items-list')).getAllByRole('listitem');
    expect(listItems[0]).toHaveTextContent('b:B');
    expect(listItems[1]).toHaveTextContent('c:C');
    expect(listItems[2]).toHaveTextContent('a:A');
  },
};

/**
 * drag 후 같은 id 집합으로 data 갱신 → staged 순서 보존 + 비-순서 필드 머지
 * (syncIfIdSetChanged 분기 1: id 집합 동일)
 */
export const ListSameIdsMerge: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 드래그
    await userEvent.click(canvas.getByTestId('drag-a-to-c'));
    // staged: [b,c,a]

    // 같은 id 집합으로 data 갱신 (label만 변경)
    await userEvent.click(canvas.getByTestId('update-same-ids'));

    // idSetChanged=false, isDirty=true 유지. useEffect([data]) 비동기 실행을 기다림
    await waitFor(() => {
      const listItems = within(canvas.getByTestId('items-list')).getAllByRole('listitem');
      expect(listItems[0]).toHaveTextContent('b:B_NEW');
    });

    expect(canvas.getByTestId('is-dirty')).toHaveTextContent('isDirty:true');
    expect(canvas.getByTestId('id-set-changed')).toHaveTextContent('idSetChanged:false');

    // staged 순서 보존 (b,c,a) + label 최신값 반영
    const listItems = within(canvas.getByTestId('items-list')).getAllByRole('listitem');
    expect(listItems[0]).toHaveTextContent('b:B_NEW');
    expect(listItems[1]).toHaveTextContent('c:C_NEW');
    expect(listItems[2]).toHaveTextContent('a:A_NEW');
  },
};

/**
 * drag 후 다른 id 집합으로 data 갱신 → idSetChanged=true
 * (syncIfIdSetChanged 분기 2: id 집합 다름)
 */
export const ListIdSetChanged: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByTestId('drag-a-to-c'));
    await userEvent.click(canvas.getByTestId('update-different-ids'));

    await waitFor(() => {
      expect(canvas.getByTestId('id-set-changed')).toHaveTextContent('idSetChanged:true');
    });
    // isDirty는 유지 (staged null화 안 됨)
    expect(canvas.getByTestId('is-dirty')).toHaveTextContent('isDirty:true');
  },
};

/**
 * idSetChanged 상태에서 keepStaged 호출 → 삭제된 id 제거, 추가된 id 끝에 append
 * (syncIfIdSetChanged 분기 3: keepStaged 선택)
 */
export const ListKeepStaged: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // staged: [b,c,a], data: [a,b,d] (c 제거, d 추가)
    await userEvent.click(canvas.getByTestId('drag-a-to-c'));
    await userEvent.click(canvas.getByTestId('update-different-ids'));

    await waitFor(() => {
      expect(canvas.getByTestId('id-set-changed')).toHaveTextContent('idSetChanged:true');
    });

    await userEvent.click(canvas.getByTestId('keep-staged'));

    // idSetChanged 해제
    await waitFor(() => {
      expect(canvas.getByTestId('id-set-changed')).toHaveTextContent('idSetChanged:false');
    });

    // staged 결과: [b, a, d]
    // - b, a: staged 객체 그대로 보존 (label은 초기값 B, A — keepStaged는 필드 머지 안 함)
    // - d: 새 data에서 추가 (label d)
    const listItems = within(canvas.getByTestId('items-list')).getAllByRole('listitem');
    expect(listItems).toHaveLength(3);
    expect(listItems[0]).toHaveTextContent('b:B');
    expect(listItems[1]).toHaveTextContent('a:A');
    expect(listItems[2]).toHaveTextContent('d:d');
  },
};

// ─── Tree 모드 story ─────────────────────────────────────────────────────────

/** tree 모드: root1 자식 내 c3→c1 재정렬 → [c3,c1,c2], isDirty=true */
export const TreeDragAndDirty: Story = {
  render: () => <TreeStagedOrderProbe />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByTestId('tree-is-dirty')).toHaveTextContent('isDirty:false');

    await userEvent.click(canvas.getByTestId('tree-drag-c3-to-c1'));

    await expect(canvas.getByTestId('tree-is-dirty')).toHaveTextContent('isDirty:true');
    await expect(canvas.getByTestId('tree-dirty-count')).toHaveTextContent('dirtyCount:3');

    // root1 자식 순서: c3, c1, c2
    const children = within(canvas.getByTestId('tree-root1-children')).getAllByRole('listitem');
    expect(children[0]).toHaveTextContent('c3:C3');
    expect(children[1]).toHaveTextContent('c1:C1');
    expect(children[2]).toHaveTextContent('c2:C2');
  },
};
