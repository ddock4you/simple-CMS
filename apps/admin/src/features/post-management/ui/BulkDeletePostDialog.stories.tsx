import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, within } from 'storybook/test';

import { BulkDeletePostDialog } from './BulkDeletePostDialog';

const meta = {
  title: 'Admin/Features/Post/BulkDeletePostDialog',
  component: BulkDeletePostDialog,
  parameters: {
    layout: 'padded',
    authenticated: true,
  },
  args: {
    ids: ['post-1', 'post-2', 'post-3'],
    open: true,
    onOpenChange: fn(),
  },
} satisfies Meta<typeof BulkDeletePostDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Stage 12f — 게시글 일괄 삭제 confirm phase 검증.
 * 선택 개수(3개)가 설명 텍스트와 삭제 버튼에 모두 표시되는지 회귀 방어.
 */
export const ConfirmPhase: Story = {
  play: async ({ canvasElement: _ }) => {
    const body = within(document.body);
    expect(
      await body.findByRole('heading', { name: '게시글 일괄 삭제' }),
    ).toBeInTheDocument();
    expect(body.getByText(/선택한 3개 게시글을 삭제/)).toBeInTheDocument();
    expect(body.getByRole('button', { name: '3개 삭제' })).toBeInTheDocument();
  },
};
