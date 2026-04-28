import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, within } from 'storybook/test';

import { BulkStatusPostDialog } from './BulkStatusPostDialog';

const meta = {
  title: 'Admin/Features/Post/BulkStatusPostDialog',
  component: BulkStatusPostDialog,
  parameters: {
    layout: 'padded',
    authenticated: true,
  },
  args: {
    ids: ['post-1', 'post-2', 'post-3'],
    open: true,
    onOpenChange: fn(),
  },
} satisfies Meta<typeof BulkStatusPostDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Stage 12f — 게시글 일괄 상태 변경 Dialog 검증.
 * "변경할 상태" Select와 개수(3개)가 설명에 표시되는지 회귀 방어.
 */
export const ShowsStatusSelect: Story = {
  play: async ({ canvasElement: _ }) => {
    const body = within(document.body);
    expect(
      await body.findByRole('heading', { name: '게시글 일괄 상태 변경' }),
    ).toBeInTheDocument();
    expect(body.getByText(/선택한 3개 게시글의 상태를 변경/)).toBeInTheDocument();
    expect(body.getByText('변경할 상태')).toBeInTheDocument();
    // 기본값 '발행' 상태가 SelectTrigger span에 렌더링됨
    expect(body.getByText('발행')).toBeInTheDocument();
  },
};
