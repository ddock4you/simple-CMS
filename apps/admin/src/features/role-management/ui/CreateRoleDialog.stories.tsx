import type { Meta, StoryObj } from '@storybook/react';

import { CreateRoleDialog } from './CreateRoleDialog';

/**
 * authenticated decorator 실행 경로를 이번 Stage에 처음 돌려보는 story.
 * `parameters.authenticated: true`로 `PermissionProvider + SidebarProvider`가 래핑되어야 한다.
 *
 * 초기 렌더는 Trigger 버튼만 보이고, 클릭 시 Dialog가 열린다.
 * submit 경로(POST /api/roles)는 Stage 7h의 MSW 도입 이후 실제 테스트 가능.
 */
const meta = {
  title: 'Admin/Features/Role/CreateRoleDialog',
  component: CreateRoleDialog,
  parameters: {
    layout: 'padded',
    authenticated: true,
  },
} satisfies Meta<typeof CreateRoleDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
