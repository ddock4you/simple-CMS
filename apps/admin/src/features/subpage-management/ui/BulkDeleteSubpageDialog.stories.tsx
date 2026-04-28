import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, within } from 'storybook/test';

import { BulkDeleteSubpageDialog } from './BulkDeleteSubpageDialog';

const meta = {
  title: 'Admin/Features/Subpage/BulkDeleteSubpageDialog',
  component: BulkDeleteSubpageDialog,
  parameters: {
    layout: 'padded',
    authenticated: true,
  },
  args: {
    ids: ['sub-1', 'sub-2', 'sub-3'],
    open: true,
    onOpenChange: fn(),
  },
} satisfies Meta<typeof BulkDeleteSubpageDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Stage 12f — 서브 페이지 일괄 삭제 confirm phase 검증.
 * 선택 개수(3개)가 설명과 삭제 버튼에 표시되는지 회귀 방어.
 */
export const ConfirmPhase: Story = {
  play: async ({ canvasElement: _ }) => {
    const body = within(document.body);
    expect(
      await body.findByRole('heading', { name: '서브 페이지 일괄 삭제' }),
    ).toBeInTheDocument();
    expect(body.getByText(/선택한 3개 서브 페이지를 삭제/)).toBeInTheDocument();
    expect(body.getByRole('button', { name: '3개 삭제' })).toBeInTheDocument();
  },
};
