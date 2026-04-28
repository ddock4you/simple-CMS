import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, within } from 'storybook/test';

import { BulkMovePostDialog } from './BulkMovePostDialog';

const meta = {
  title: 'Admin/Features/Post/BulkMovePostDialog',
  component: BulkMovePostDialog,
  parameters: {
    layout: 'padded',
    authenticated: true,
  },
  args: {
    ids: ['post-1', 'post-2', 'post-3'],
    open: true,
    onOpenChange: fn(),
  },
} satisfies Meta<typeof BulkMovePostDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Stage 12f — 게시판 일괄 이동 Dialog 검증.
 * "대상 게시판" Select와 개수(3개)가 설명에 표시되는지 회귀 방어.
 * useQuery(boardOptionsQuery())는 Storybook 환경에서 빈 목록으로 처리됨.
 */
export const ConfirmPhase: Story = {
  play: async ({ canvasElement: _ }) => {
    const body = within(document.body);
    expect(
      await body.findByRole('heading', { name: '게시판 일괄 이동' }),
    ).toBeInTheDocument();
    expect(body.getByText(/선택한 3개 게시글을 다른 게시판으로/)).toBeInTheDocument();
    expect(body.getByText('대상 게시판')).toBeInTheDocument();
    // 게시판 미선택 상태: 이동 버튼 disabled
    expect(body.getByRole('button', { name: '3개 이동' })).toBeDisabled();
  },
};
