import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from 'storybook/test';
import type { UserStatus } from '@simple-cms/db';

import { UserActionButtons } from './UserActionButtons';

const meta = {
  title: 'Admin/Features/User/UserActionButtons',
  component: UserActionButtons,
  parameters: {
    layout: 'padded',
    authenticated: true,
  },
  args: {
    userId: 'user-story-1',
    isSelf: false,
    status: 'ACTIVE' as UserStatus,
  },
} satisfies Meta<typeof UserActionButtons>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Stage 12g — PENDING 사용자: 승인/거절 버튼 회귀 방어.
 */
export const PendingApprovalButtons: Story = {
  args: { status: 'PENDING' as UserStatus },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByRole('button', { name: '승인' })).toBeInTheDocument();
    expect(canvas.getByRole('button', { name: '거절' })).toBeInTheDocument();
  },
};

/**
 * Stage 12g — ACTIVE 사용자(본인 아님): 정지 버튼 활성화 회귀 방어.
 */
export const ActiveUserSuspend: Story = {
  args: { status: 'ACTIVE' as UserStatus, isSelf: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const btn = canvas.getByRole('button', { name: '정지' });
    expect(btn).toBeInTheDocument();
    expect(btn).not.toBeDisabled();
  },
};

/**
 * Stage 12g — 본인 계정 정지 차단: isSelf=true 시 정지 버튼 disabled 회귀 방어.
 */
export const SelfSuspendDisabled: Story = {
  args: { status: 'ACTIVE' as UserStatus, isSelf: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByRole('button', { name: '정지' })).toBeDisabled();
  },
};

/**
 * Stage 12g — SUSPENDED 사용자: 해제 버튼 회귀 방어.
 */
export const SuspendedUserReactivate: Story = {
  args: { status: 'SUSPENDED' as UserStatus },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByRole('button', { name: '해제' })).toBeInTheDocument();
  },
};
