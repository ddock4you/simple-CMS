import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { InlineStatusSwitchToggle } from './InlineStatusSwitchToggle';

/**
 * 목록 셀 안에서 2-option enum 상태(DRAFT/PUBLISHED)를 Switch + 라벨로 인라인 토글.
 * InlineBooleanToggle 시각 패턴과 동일 — SubpageTable/PostTable에서 사용.
 * labelOn/labelOff로 도메인별 문구 커스터마이즈 가능 (status 외 2-option enum 재사용).
 */
const meta = {
  title: 'Admin/Shared/InlineStatusSwitchToggle',
  component: InlineStatusSwitchToggle,
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof InlineStatusSwitchToggle>;

export default meta;

type Story = StoryObj<typeof meta>;

type Status = 'DRAFT' | 'PUBLISHED';

function DefaultDemo() {
  const [value, setValue] = useState<Status>('DRAFT');
  return (
    <InlineStatusSwitchToggle
      value={value}
      onState={'PUBLISHED' as Status}
      offState={'DRAFT' as Status}
      onChange={setValue}
    />
  );
}

export const Default: Story = {
  args: {
    value: 'DRAFT' as Status,
    onState: 'PUBLISHED' as Status,
    offState: 'DRAFT' as Status,
    onChange: () => {},
  },
  render: () => <DefaultDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 초기 상태: "초안" 라벨
    expect(canvas.getByText('초안')).toBeInTheDocument();

    // Switch 클릭 → PUBLISHED로 전환
    const switchEl = canvas.getByRole('switch');
    await userEvent.click(switchEl);

    // "발행" 라벨로 변경
    expect(canvas.getByText('발행')).toBeInTheDocument();
  },
};

export const Pending: Story = {
  args: {
    value: 'DRAFT' as Status,
    onState: 'PUBLISHED' as Status,
    offState: 'DRAFT' as Status,
    onChange: () => {},
    isPending: true,
  },
};

export const Disabled: Story = {
  args: {
    value: 'PUBLISHED' as Status,
    onState: 'PUBLISHED' as Status,
    offState: 'DRAFT' as Status,
    onChange: () => {},
    disabled: true,
  },
};

type Visibility = '공개' | '비공개';

function CustomLabelsDemo() {
  const [value, setValue] = useState<Visibility>('비공개');
  return (
    <InlineStatusSwitchToggle
      value={value}
      onState={'공개' as Visibility}
      offState={'비공개' as Visibility}
      onChange={setValue}
      labelOn="공개"
      labelOff="비공개"
    />
  );
}

export const CustomLabels: Story = {
  args: {
    value: '비공개' as Visibility,
    onState: '공개' as Visibility,
    offState: '비공개' as Visibility,
    onChange: () => {},
    labelOn: '공개',
    labelOff: '비공개',
  },
  render: () => <CustomLabelsDemo />,
};
