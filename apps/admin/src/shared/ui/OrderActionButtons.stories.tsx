import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { OrderActionButtons } from './OrderActionButtons';

const meta = {
  title: 'Admin/Shared/OrderActionButtons',
  component: OrderActionButtons,
  parameters: {
    layout: 'padded',
  },
  args: {
    onReset: fn(),
    onSave: fn(),
  },
} satisfies Meta<typeof OrderActionButtons>;

export default meta;
type Story = StoryObj<typeof meta>;

/** dirty 아님 — 두 버튼 모두 disabled, 변경 count 미노출 */
export const Idle: Story = {
  args: { dirtyCount: 0, isSaving: false },
};

/** 3개 변경됨 — "3개 변경됨" 배지 노출 + 두 버튼 활성화. 클릭 → 콜백 호출 검증 */
export const Dirty: Story = {
  args: { dirtyCount: 3, isSaving: false },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    expect(canvas.getByText('3개 변경됨')).toBeInTheDocument();

    await userEvent.click(canvas.getByRole('button', { name: /되돌리기/ }));
    expect(args.onReset).toHaveBeenCalledOnce();

    await userEvent.click(canvas.getByRole('button', { name: /순서 저장/ }));
    expect(args.onSave).toHaveBeenCalledOnce();
  },
};

/** 저장 중 — 저장 버튼에 Spinner + aria-busy, 두 버튼 모두 disabled */
export const Saving: Story = {
  args: { dirtyCount: 3, isSaving: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const saveBtn = canvas.getByRole('button', { name: /순서 저장/ });
    const resetBtn = canvas.getByRole('button', { name: /되돌리기/ });

    await expect(saveBtn).toBeDisabled();
    await expect(saveBtn).toHaveAttribute('aria-busy', 'true');
    await expect(resetBtn).toBeDisabled();
  },
};

/** dirty=false — 두 버튼 모두 disabled 상태 명시적 검증 */
export const Disabled: Story = {
  args: { dirtyCount: 0, isSaving: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: /되돌리기/ })).toBeDisabled();
    await expect(canvas.getByRole('button', { name: /순서 저장/ })).toBeDisabled();
  },
};
