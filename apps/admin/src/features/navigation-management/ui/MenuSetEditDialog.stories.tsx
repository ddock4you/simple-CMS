import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from 'storybook/test';
import type { NavigationMenuSlot } from '@simple-cms/db';

import { MenuSetEditDialog } from './MenuSetEditDialog';

const meta = {
  title: 'Admin/Features/Navigation/MenuSetEditDialog',
  component: MenuSetEditDialog,
  parameters: {
    layout: 'padded',
    authenticated: true,
  },
  args: {
    menuId: 'story-menu-1',
    name: '메인 메뉴',
    description: null,
    slots: ['HEADER'] as NavigationMenuSlot[],
  },
} satisfies Meta<typeof MenuSetEditDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Stage 12f — 메뉴 설정 Dialog 트리거 + 필드 검증.
 * "메뉴 설정" 트리거 버튼 클릭 → "메뉴 설정 수정" Dialog 오픈 →
 * "메뉴 이름" 입력 필드 + 슬롯 체크박스(헤더/푸터/우측 사이드바)가 노출되는지 회귀 방어.
 */
export const OpenAndEditSlots: Story = {
  play: async ({ canvasElement: _ }) => {
    const body = within(document.body);

    // 트리거 버튼 클릭
    const trigger = await body.findByRole('button', { name: /메뉴 설정/ });
    await userEvent.click(trigger);

    // Dialog 오픈 후 필드 검증
    expect(
      await body.findByRole('heading', { name: '메뉴 설정 수정' }),
    ).toBeInTheDocument();
    expect(body.getByLabelText('메뉴 이름')).toBeInTheDocument();
    expect(body.getByText('슬롯 배치')).toBeInTheDocument();
    // 슬롯 옵션 3개 모두 노출
    expect(body.getByText('헤더')).toBeInTheDocument();
    expect(body.getByText('푸터')).toBeInTheDocument();
    expect(body.getByText('우측 사이드바')).toBeInTheDocument();
  },
};
