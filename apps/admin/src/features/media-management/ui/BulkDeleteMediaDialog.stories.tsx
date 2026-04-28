import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, within } from 'storybook/test';

import { BulkDeleteMediaDialog } from './BulkDeleteMediaDialog';

const meta = {
  title: 'Admin/Features/Media/BulkDeleteMediaDialog',
  component: BulkDeleteMediaDialog,
  parameters: {
    layout: 'padded',
    authenticated: true,
  },
  args: {
    ids: ['m-1', 'm-2', 'm-3'],
    open: true,
    onOpenChange: fn(),
  },
} satisfies Meta<typeof BulkDeleteMediaDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Stage 12h — confirm 단계: 제목·설명·삭제 버튼(3개) 회귀 방어.
 */
export const ConfirmPhase: Story = {
  play: async () => {
    const body = within(document.body);
    expect(
      await body.findByRole('heading', { name: '미디어 일괄 삭제' }),
    ).toBeInTheDocument();
    expect(
      body.getByText(/선택한 3개 미디어를 삭제하시겠습니까/),
    ).toBeInTheDocument();
    expect(body.getByRole('button', { name: '3개 삭제' })).toBeInTheDocument();
  },
};
