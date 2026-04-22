import type { Meta, StoryObj } from '@storybook/react';

import { AdminHeader } from './AdminHeader';

/**
 * `SidebarTrigger`가 `useSidebar()`를 호출하므로 `SidebarProvider`가 필수.
 * authenticated decorator가 `PermissionProvider + SidebarProvider`를 함께 래핑.
 *
 * 내부 `CommandPaletteTrigger`는 `Cmd+K` / `Ctrl+K`로 팔레트를 여는 보조 버튼이며
 * Storybook canvas에서 단축키 focus가 불안정할 수 있음 (수동 클릭만 테스트).
 */
const meta = {
  title: 'Admin/Shared/Layout/AdminHeader',
  component: AdminHeader,
  parameters: {
    layout: 'fullscreen',
    authenticated: true,
  },
} satisfies Meta<typeof AdminHeader>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    user: {
      name: '관리자',
      username: 'admin',
      role: { name: '총괄 관리자' },
    },
  },
};

export const WithoutRole: Story = {
  args: {
    user: {
      name: '승인 대기 사용자',
      username: 'pending',
      role: null,
    },
  },
};
