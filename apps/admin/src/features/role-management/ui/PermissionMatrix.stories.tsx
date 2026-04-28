import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from 'storybook/test';

import { PermissionMatrix } from './PermissionMatrix';

const EMPTY_PERMISSIONS: Record<string, Record<string, boolean>> = {};

const meta = {
  title: 'Admin/Features/Role/PermissionMatrix',
  component: PermissionMatrix,
  parameters: {
    layout: 'padded',
    authenticated: true,
  },
  args: {
    roleId: 'role-story-1',
    permissions: EMPTY_PERMISSIONS,
    isSystem: false,
  },
} satisfies Meta<typeof PermissionMatrix>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Stage 12g — 총괄 관리자 역할: 읽기 전용 안내 문구 + 저장/취소 없음 + 전체 체크박스 disabled 회귀 방어.
 */
export const SystemRoleReadonly: Story = {
  args: { isSystem: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(
      canvas.getByText('총괄 관리자는 모든 권한을 보유하며 수정할 수 없습니다.'),
    ).toBeInTheDocument();
    expect(canvas.queryByRole('button', { name: '저장' })).not.toBeInTheDocument();
    expect(canvas.queryByRole('button', { name: '취소' })).not.toBeInTheDocument();
    const checkboxes = canvas.getAllByRole('checkbox');
    checkboxes.forEach((cb) => expect(cb).toBeDisabled());
  },
};

/**
 * Stage 12g — 일반 역할 매트릭스: 체크박스 토글 → 저장/취소 활성화 회귀 방어.
 */
export const EditableRoleMatrix: Story = {
  args: { isSystem: false, permissions: EMPTY_PERMISSIONS },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(
      canvas.queryByText(/총괄 관리자는 모든 권한을 보유하며/),
    ).not.toBeInTheDocument();
    expect(canvas.getByRole('button', { name: '저장' })).toBeDisabled();
    expect(canvas.getByRole('button', { name: '취소' })).toBeDisabled();
    const subpagesRow = canvas.getByText('서브 페이지').closest('tr') as HTMLElement;
    const checkboxes = within(subpagesRow).getAllByRole('checkbox');
    await userEvent.click(checkboxes[0]);
    expect(checkboxes[0]).toBeChecked();
    expect(canvas.getByRole('button', { name: '저장' })).not.toBeDisabled();
    expect(canvas.getByRole('button', { name: '취소' })).not.toBeDisabled();
  },
};
