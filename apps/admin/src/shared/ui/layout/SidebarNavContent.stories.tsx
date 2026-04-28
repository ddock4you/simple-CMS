import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from 'storybook/test';

import { SidebarNavGroups } from './SidebarNavContent';

const meta = {
  title: 'Admin/Shared/Layout/SidebarNavGroups',
  component: SidebarNavGroups,
  parameters: {
    layout: 'padded',
    authenticated: true,
  },
} satisfies Meta<typeof SidebarNavGroups>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Stage 12g — 총괄 관리자: 콘텐츠·시스템 그룹 전체 메뉴 노출 회귀 방어.
 */
export const SystemAdminAllMenus: Story = {
  args: { user: { role: { isSystem: true, permissions: {} } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText('콘텐츠')).toBeInTheDocument();
    expect(canvas.getByText('시스템')).toBeInTheDocument();
    expect(canvas.getByText('서브 페이지')).toBeInTheDocument();
    expect(canvas.getByText('사용자 관리')).toBeInTheDocument();
  },
};

/**
 * Stage 12g — 서브 페이지 read 권한만 보유: 콘텐츠 그룹에 서브 페이지만 노출,
 * 시스템 그룹 전체 + 게시글 미노출 회귀 방어.
 */
export const ContentEditorLimited: Story = {
  args: {
    user: {
      role: {
        isSystem: false,
        permissions: { subpages: { read: true } },
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText('서브 페이지')).toBeInTheDocument();
    expect(canvas.queryByText('시스템')).not.toBeInTheDocument();
    expect(canvas.queryByText('사용자 관리')).not.toBeInTheDocument();
    expect(canvas.queryByText('게시글')).not.toBeInTheDocument();
  },
};
