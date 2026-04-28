import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from 'storybook/test';

import { DomainSettingsForm } from './DomainSettingsForm';

const meta = {
  title: 'Admin/Features/Settings/DomainSettingsForm',
  component: DomainSettingsForm,
  parameters: {
    layout: 'padded',
    authenticated: true,
  },
} satisfies Meta<typeof DomainSettingsForm>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Stage 12h — 프로토콜 포함 도메인 입력 시 유효성 오류 표시 회귀 방어.
 * isDirty=true 이후 저장 클릭 → zod 오류 메시지 렌더.
 */
export const ProtocolInDomainError: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByPlaceholderText('www.example.com');
    await userEvent.type(input, 'http://example.com');
    await userEvent.click(canvas.getByRole('button', { name: '저장' }));
    expect(
      await canvas.findByText(
        '유효한 도메인 형식이 아닙니다. (예: www.example.com)',
      ),
    ).toBeInTheDocument();
  },
};
