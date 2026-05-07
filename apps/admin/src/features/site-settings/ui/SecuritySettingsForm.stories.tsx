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
 * query 미응답 시 concurrentLoginEnabled 기본값 true → Switch checked 상태.
 * Switch 클릭(false 전환 시도) → controlled AlertDialog 표시.
 */
export const DisableConfirmDialog: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // 기본값 true: Switch는 checked 상태. 클릭하면 false 전환 시도 → AlertDialog 팝업
    const switchEl = await canvas.findByRole('switch');
    await userEvent.click(switchEl);
    const body = within(document.body);
    expect(
      await body.findByRole('heading', { name: '단일 세션 강제' }),
    ).toBeInTheDocument();
  },
};
