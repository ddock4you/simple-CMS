import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import { InlineStatusToggle } from './InlineStatusToggle';

/**
 * 목록 셀 안에서 enum 상태(DRAFT/PUBLISHED 등)를 인라인 전환.
 * Stage 7c의 "빠른 상태 토글" 공용 UI — optimistic update + onError rollback
 * 을 동반하는 mutation 훅(예: `useUpdateSubpageStatus`)과 조합.
 * 권한 없을 때는 호출자 레벨에서 Badge로 교체(이 컴포넌트는 disabled 모드만
 * 지원 — 시연용).
 */
const meta = {
  title: 'Admin/Shared/InlineStatusToggle',
  component: InlineStatusToggle,
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof InlineStatusToggle>;

export default meta;

type Story = StoryObj<typeof meta>;

type Status = 'DRAFT' | 'PUBLISHED';
const STATUS_OPTIONS = [
  { value: 'DRAFT' as const, label: '초안' },
  { value: 'PUBLISHED' as const, label: '발행' },
];

function DefaultDemo() {
  const [value, setValue] = useState<Status>('DRAFT');
  return (
    <InlineStatusToggle
      value={value}
      options={STATUS_OPTIONS}
      onChange={setValue}
    />
  );
}

export const Default: Story = {
  args: {
    value: 'DRAFT' as Status,
    options: STATUS_OPTIONS,
    onChange: () => {},
  },
  render: () => <DefaultDemo />,
};

export const Pending: Story = {
  args: {
    value: 'DRAFT',
    options: STATUS_OPTIONS,
    onChange: () => {},
    isPending: true,
  },
};

export const Disabled: Story = {
  args: {
    value: 'PUBLISHED',
    options: STATUS_OPTIONS,
    onChange: () => {},
    disabled: true,
  },
};
