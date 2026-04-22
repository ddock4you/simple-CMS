import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';

import { ConfirmLeaveDialog } from './ConfirmLeaveDialog';

const meta = {
  title: 'Admin/Shared/ConfirmLeaveDialog',
  component: ConfirmLeaveDialog,
  parameters: {
    layout: 'centered',
  },
  args: {
    onConfirm: fn(),
    onCancel: fn(),
  },
} satisfies Meta<typeof ConfirmLeaveDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Open: Story = {
  args: {
    open: true,
  },
};

export const Closed: Story = {
  args: {
    open: false,
  },
};

export const CustomLabels: Story = {
  args: {
    open: true,
    title: '저장하지 않은 변경사항도 함께 발행됩니다',
    description:
      '편집 중인 제목·SEO 등 메타데이터가 발행 상태로 저장됩니다. 계속하시겠습니까?',
    confirmLabel: '발행으로 변경',
    cancelLabel: '취소',
  },
};
