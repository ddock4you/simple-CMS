import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, within } from 'storybook/test';
import type { MenuItemNode } from '../model/navigationFilters';

import { MenuItemDialog } from './MenuItemDialog';

const meta = {
  title: 'Admin/Features/Navigation/MenuItemDialog',
  component: MenuItemDialog,
  parameters: {
    layout: 'padded',
    authenticated: true,
  },
  args: {
    open: true,
    onOpenChange: fn(),
    onSubmit: fn(),
    isPending: false,
    parentId: null,
    editItem: null,
  },
} satisfies Meta<typeof MenuItemDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Stage 12f — 메뉴 항목 추가 Dialog 기본 필드 검증.
 * 추가 모드에서 "메뉴 항목 추가" 타이틀, "항목 타입" 라벨, "라벨" 입력 필드,
 * "추가" 버튼이 모두 노출되는지 회귀 방어.
 */
export const AddItemDefault: Story = {
  play: async ({ canvasElement: _ }) => {
    const body = within(document.body);
    expect(
      await body.findByRole('heading', { name: '메뉴 항목 추가' }),
    ).toBeInTheDocument();
    expect(body.getByText('항목 타입')).toBeInTheDocument();
    expect(body.getByLabelText('라벨')).toBeInTheDocument();
    expect(body.getByRole('button', { name: '추가' })).toBeInTheDocument();
  },
};

/**
 * Stage 12f — EXTERNAL 타입 편집 모드 검증.
 * editItem.itemType='EXTERNAL'이면 URL 입력 필드가 자동으로 노출되는지 회귀 방어.
 * (타입 Select 클릭 없이 초기 렌더 상태에서 조건부 URL 필드를 검증)
 */
export const EditItemExternal: Story = {
  args: {
    editItem: {
      id: 'item-ext-1',
      label: '외부 사이트',
      itemType: 'EXTERNAL',
      subpageId: null,
      boardId: null,
      url: 'https://example.com',
      isVisible: true,
      openInNewTab: false,
      displayOrder: 0,
      startDate: null,
      endDate: null,
      children: [],
      subpageName: null,
      boardName: null,
    } satisfies MenuItemNode,
  },
  play: async ({ canvasElement: _ }) => {
    const body = within(document.body);
    expect(
      await body.findByRole('heading', { name: '메뉴 항목 수정' }),
    ).toBeInTheDocument();
    // EXTERNAL 타입일 때 URL 입력 필드 노출
    expect(body.getByLabelText('URL')).toBeInTheDocument();
    expect(body.getByRole('button', { name: '수정' })).toBeInTheDocument();
  },
};
