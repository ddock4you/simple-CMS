import type { Meta, StoryObj } from '@storybook/react';

import type { FilteredMenuItem } from '@/entities/navigation/lib/filterMenuItems';

import { RightSidebar } from './RightSidebar';

/**
 * KRDS `InPageNavigation` 원본은 앵커 스크롤 전용이라 사용 불가.
 * RightSidebar는 동일 DOM 구조·CSS 클래스만 차용한 **커스텀 JSX**다.
 * 따라서 `Web/KRDS/*`가 아닌 `Web/Widgets/*` 카테고리.
 *
 * `usePathname()` 훅을 쓰므로 `nextjs.appDirectory: true` 전역 parameter가 필요
 * (apps/web/.storybook/preview.tsx에 등록됨).
 */
const makeLeaf = (id: string, label: string, url: string): FilteredMenuItem => ({
  id,
  label,
  itemType: 'CUSTOM',
  url,
  openInNewTab: false,
  subpage: null,
  board: null,
  children: [],
});

const threeItems: FilteredMenuItem[] = [
  makeLeaf('nav-1', '빠른 신청', '/apply'),
  makeLeaf('nav-2', '자료실', '/resources'),
  makeLeaf('nav-3', '문의하기', '/contact'),
];

const fiveItems: FilteredMenuItem[] = [
  ...threeItems,
  makeLeaf('nav-4', '공지사항', '/notice'),
  makeLeaf('nav-5', '자주 묻는 질문', '/faq'),
];

const meta = {
  title: 'Web/Widgets/RightSidebar',
  component: RightSidebar,
  parameters: {
    layout: 'padded',
  },
  args: {
    menuName: '빠른 이동',
  },
} satisfies Meta<typeof RightSidebar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ThreeItems: Story = {
  args: {
    items: threeItems,
  },
};

export const FiveItems: Story = {
  args: {
    items: fiveItems,
  },
};

export const Empty: Story = {
  args: {
    items: [],
  },
};
