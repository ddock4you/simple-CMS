import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { useQueryClient } from '@tanstack/react-query';

import type { PageBlockListItem } from '@simple-cms/types';

import { blockKeys } from '@/shared/api/queryKeys';

import { BlockManager } from './BlockManager';

const MOCK_BLOCKS: PageBlockListItem[] = [
  {
    id: 'block-1',
    subpageId: 'story-subpage-1',
    blockType: 'RICH_TEXT',
    displayOrder: 0,
    isVisible: true,
    configJson: {
      contentJson: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: '첫 번째 블록' }],
          },
        ],
      },
    },
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'block-2',
    subpageId: 'story-subpage-1',
    blockType: 'HTML',
    displayOrder: 1,
    isVisible: true,
    configJson: { html: '<p>두 번째 블록</p>', css: null },
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'block-3',
    subpageId: 'story-subpage-1',
    blockType: 'IMAGE',
    displayOrder: 2,
    isVisible: false,
    configJson: {
      imageUrl: 'https://example.com/photo.jpg',
      imageAlt: '예시 이미지',
      imageMediaId: null,
      caption: null,
      linkUrl: null,
    },
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
];

/**
 * BlockManager의 useQuery(blockListOptions) 호출이 네트워크 없이 데이터를 볼 수 있도록
 * 렌더 전에 QueryClient 캐시에 mock 블록을 주입한다.
 * fetchStub timing race 방지 패턴 — setQueryData가 동기적으로 캐시를 채운 후 BlockManager가 마운트됨.
 */
function QueryDataSeed({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  qc.setQueryData(blockKeys.lists('story-subpage-1'), MOCK_BLOCKS);
  return <>{children}</>;
}

const meta = {
  title: 'Admin/Features/Block/BlockManager',
  component: BlockManager,
  parameters: {
    layout: 'padded',
    authenticated: true,
  },
  args: {
    subpageId: 'story-subpage-1',
  },
} satisfies Meta<typeof BlockManager>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Stage 12e — 3개 블록 렌더 + 드래그 핸들 접근성 검증.
 * canUpdate=true(full-permission)일 때 각 카드에 드래그 핸들이 노출되고
 * tabIndex=0이 설정되어 키보드 접근 가능해야 함.
 */
export const WithBlocks: Story = {
  decorators: [(Story) => <QueryDataSeed><Story /></QueryDataSeed>],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const handles = await canvas.findAllByRole('button', { name: '순서 변경' });

    expect(handles).toHaveLength(3);
    for (const handle of handles) {
      expect(handle).toHaveAttribute('tabindex', '0');
    }
  },
};

/**
 * Stage 12e — 키보드 드래그 앤 드롭 접근성 검증.
 * Space로 드래그 활성화 → aria-pressed="true" 설정 확인.
 * ArrowDown 이동 후 Space 드롭 → aria-pressed 해제 확인.
 * dnd-kit KeyboardSensor + sortableKeyboardCoordinates 경로 회귀 방어.
 */
export const KeyboardReorder: Story = {
  decorators: [(Story) => <QueryDataSeed><Story /></QueryDataSeed>],
  parameters: {
    fetchMock: {
      'blocks/reorder': { status: 200, body: { success: true, data: null } },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const handles = await canvas.findAllByRole('button', { name: '순서 변경' });
    const first = handles[0];

    first.focus();

    await userEvent.keyboard(' '); // Space: 키보드 드래그 활성화
    await waitFor(() =>
      expect(first).toHaveAttribute('aria-pressed', 'true'),
    );

    await userEvent.keyboard('{ArrowDown}'); // 한 단계 아래로 이동

    await userEvent.keyboard(' '); // Space: 드롭
    await waitFor(() =>
      expect(first).not.toHaveAttribute('aria-pressed', 'true'),
    );
  },
};
