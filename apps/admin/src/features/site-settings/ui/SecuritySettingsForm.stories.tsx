import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from 'storybook/test';

import { SecuritySettingsForm } from './SecuritySettingsForm';

const meta = {
  title: 'Admin/Features/Settings/SecuritySettingsForm',
  component: SecuritySettingsForm,
  parameters: {
    layout: 'padded',
    authenticated: true,
  },
} satisfies Meta<typeof SecuritySettingsForm>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Stage 12h — 단일 세션 전환 확인 AlertDialog 표시 회귀 방어.
 * query 미응답 시 concurrentLoginEnabled 기본값 true → 트리거 버튼 노출됨.
 */
export const DisableConfirmDialog: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const triggerBtn = await canvas.findByRole('button', {
      name: '단일 세션으로 변경',
    });
    await userEvent.click(triggerBtn);
    const body = within(document.body);
    expect(
      await body.findByRole('heading', { name: '단일 세션 강제' }),
    ).toBeInTheDocument();
  },
};
