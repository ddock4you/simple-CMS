import type { Meta, StoryObj } from '@storybook/react';

import { Button } from './button';

const meta = {
  title: 'Admin/Shadcn/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'outline', 'secondary', 'ghost', 'destructive', 'link'],
    },
    size: {
      control: { type: 'select' },
      options: ['default', 'xs', 'sm', 'lg', 'icon', 'icon-xs', 'icon-sm', 'icon-lg'],
    },
  },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: '저장',
    variant: 'default',
  },
};

export const Outline: Story = {
  args: {
    children: '취소',
    variant: 'outline',
  },
};

export const Secondary: Story = {
  args: {
    children: '보기',
    variant: 'secondary',
  },
};

export const Ghost: Story = {
  args: {
    children: '더보기',
    variant: 'ghost',
  },
};

export const Destructive: Story = {
  args: {
    children: '삭제',
    variant: 'destructive',
  },
};
