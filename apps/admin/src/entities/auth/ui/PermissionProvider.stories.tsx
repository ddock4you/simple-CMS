import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from 'storybook/test';

import { usePermission } from './PermissionProvider';

/**
 * `usePermission` 훅의 Context 기반 권한 체크가 `parameters.permissions` /
 * `parameters.isSystem` override에 따라 정확히 반응하는지 검증하는 probe.
 *
 * Stage 7h 작업 1 — 권한 경계(`isSystem` 바이패스 / 미정의 리소스 DENIED)를
 * play function으로 회귀 감지. 이 훅은 admin 전체에서 사이드바 필터·버튼 표시를
 * 좌우하므로 동작이 바뀌면 여러 UI에서 동시 regression 발생.
 */
function PermissionProbe() {
  const canReadSubpages = usePermission('subpages', 'read');
  const canDeleteSubpages = usePermission('subpages', 'delete');
  const canCreateRoles = usePermission('roles', 'create');

  return (
    <div
      style={{
        padding: 16,
        fontFamily: 'monospace',
        fontSize: 14,
        lineHeight: 1.8,
      }}
    >
      <p data-testid="subpages-read">
        subpages:read = {canReadSubpages ? 'ALLOWED' : 'DENIED'}
      </p>
      <p data-testid="subpages-delete">
        subpages:delete = {canDeleteSubpages ? 'ALLOWED' : 'DENIED'}
      </p>
      <p data-testid="roles-create">
        roles:create = {canCreateRoles ? 'ALLOWED' : 'DENIED'}
      </p>
    </div>
  );
}

const meta = {
  title: 'Admin/Entities/Auth/PermissionProvider',
  component: PermissionProbe,
  parameters: {
    layout: 'padded',
    authenticated: true,
  },
} satisfies Meta<typeof PermissionProbe>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Default authenticated decorator — `buildFullPermissions()`로 모든 리소스 full access.
 * 세 probe 모두 ALLOWED 기대.
 */
export const FullAccess: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByTestId('subpages-read')).toHaveTextContent(
      'subpages:read = ALLOWED',
    );
    expect(canvas.getByTestId('subpages-delete')).toHaveTextContent(
      'subpages:delete = ALLOWED',
    );
    expect(canvas.getByTestId('roles-create')).toHaveTextContent(
      'roles:create = ALLOWED',
    );
  },
};

/**
 * `parameters.permissions` override — subpages read만 허용, 그 외 전부 DENIED.
 * roles는 permissions map에 아예 미정의 → `permissions[resource][action] === true`
 * 실패 → DENIED.
 */
export const ReadOnly: Story = {
  parameters: {
    authenticated: true,
    permissions: {
      subpages: { create: false, read: true, update: false, delete: false },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByTestId('subpages-read')).toHaveTextContent(
      'subpages:read = ALLOWED',
    );
    expect(canvas.getByTestId('subpages-delete')).toHaveTextContent(
      'subpages:delete = DENIED',
    );
    expect(canvas.getByTestId('roles-create')).toHaveTextContent(
      'roles:create = DENIED',
    );
  },
};

/**
 * 총괄 관리자(`isSystem: true`)는 permissions 값과 무관하게 모두 true 반환.
 * 빈 permissions 맵이어도 세 probe 모두 ALLOWED.
 */
export const SystemAdmin: Story = {
  parameters: {
    authenticated: true,
    isSystem: true,
    permissions: {},
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByTestId('subpages-read')).toHaveTextContent(
      'subpages:read = ALLOWED',
    );
    expect(canvas.getByTestId('subpages-delete')).toHaveTextContent(
      'subpages:delete = ALLOWED',
    );
    expect(canvas.getByTestId('roles-create')).toHaveTextContent(
      'roles:create = ALLOWED',
    );
  },
};
