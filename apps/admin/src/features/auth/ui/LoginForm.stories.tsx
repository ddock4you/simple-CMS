import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from 'storybook/test';

import { LoginForm } from './LoginForm';

/**
 * 비인증 페이지이므로 `parameters.authenticated` 없이 root decorator만 적용.
 * Stage 7h 작업 1 — Zod `loginSchema`의 `min(1)` rule이 빈 submit에서
 * 필드별 에러 메시지를 표시하는지 play function으로 검증.
 * MSW 의존 시나리오(PENDING_APPROVAL 분기 등)는 addon-vitest 호환성 이슈로 보류.
 */
const meta = {
  title: 'Admin/Features/Auth/LoginForm',
  component: LoginForm,
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof LoginForm>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ValidationEmpty: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: '로그인' }));

    expect(
      await canvas.findByText('아이디를 입력해주세요.'),
    ).toBeInTheDocument();
    expect(
      await canvas.findByText('비밀번호를 입력해주세요.'),
    ).toBeInTheDocument();
  },
};
