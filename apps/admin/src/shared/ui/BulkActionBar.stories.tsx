import type { Meta, StoryObj } from '@storybook/react';
import { Trash2, CheckCircle2 } from 'lucide-react';
import { fn } from 'storybook/test';

import { BulkActionBar } from './BulkActionBar';

const meta = {
  title: 'Admin/Shared/BulkActionBar',
  component: BulkActionBar,
  parameters: {
    layout: 'padded',
  },
  args: {
    totalOnPage: 20,
    onToggleAll: fn(),
    onClear: fn(),
    actions: [
      {
        key: 'status',
        label: '상태 변경',
        icon: <CheckCircle2 className="mr-1 size-4" />,
        variant: 'outline',
        onClick: fn(),
      },
      {
        key: 'delete',
        label: '삭제',
        icon: <Trash2 className="mr-1 size-4" />,
        variant: 'destructive',
        onClick: fn(),
      },
    ],
  },
} satisfies Meta<typeof BulkActionBar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const NoSelection: Story = {
  args: {
    selectedCount: 0,
    isAllOnPageSelected: false,
    isIndeterminate: false,
  },
};

export const OneSelected: Story = {
  args: {
    selectedCount: 1,
    isAllOnPageSelected: false,
    isIndeterminate: true,
  },
};

export const ManySelected: Story = {
  args: {
    selectedCount: 7,
    isAllOnPageSelected: false,
    isIndeterminate: true,
  },
};

export const AllSelected: Story = {
  args: {
    selectedCount: 20,
    isAllOnPageSelected: true,
    isIndeterminate: false,
  },
};
