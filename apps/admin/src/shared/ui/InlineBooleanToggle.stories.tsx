import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import { InlineBooleanToggle } from './InlineBooleanToggle';

/**
 * 목록 셀 안에서 boolean 상태(공개/비공개, 노출/숨김 등)를 인라인 토글.
 * Stage 7c의 "빠른 상태 토글" 공용 UI. labelOn/labelOff로 도메인별 문구 커스터
 * 마이즈. mutation 훅과 조합 + optimistic update 패턴 권장.
 */
const meta = {
  title: 'Admin/Shared/InlineBooleanToggle',
  component: InlineBooleanToggle,
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof InlineBooleanToggle>;

export default meta;

type Story = StoryObj<typeof meta>;

function DefaultDemo() {
  const [value, setValue] = useState(true);
  return <InlineBooleanToggle value={value} onChange={setValue} />;
}

export const Default: Story = {
  args: {
    value: true,
    onChange: () => {},
  },
  render: () => <DefaultDemo />,
};

export const Pending: Story = {
  args: {
    value: true,
    onChange: () => {},
    isPending: true,
  },
};

function CustomLabelsDemo() {
  const [value, setValue] = useState(false);
  return (
    <InlineBooleanToggle
      value={value}
      onChange={setValue}
      labelOn="노출"
      labelOff="숨김"
    />
  );
}

export const CustomLabels: Story = {
  args: {
    value: false,
    onChange: () => {},
  },
  render: () => <CustomLabelsDemo />,
};
