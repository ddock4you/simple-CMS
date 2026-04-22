import type { Meta, StoryObj } from '@storybook/react';

import { LoginForm } from './LoginForm';

/**
 * 비인증 페이지이므로 `parameters.authenticated` 없이 root decorator만 적용.
 * play function(폼 validation, 로그인 시도)은 Stage 7g에서 추가.
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
