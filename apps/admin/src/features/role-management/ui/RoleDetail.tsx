'use client';

import { useQuery } from '@tanstack/react-query';

import { roleDetailOptions } from '@/features/role-management/api/roleQueries';
import { PermissionMatrix } from '@/features/role-management/ui/PermissionMatrix';
import { SystemBadge, DefaultBadge } from '@/features/role-management/ui/RoleBadges';

interface RoleDetailProps {
  roleId: string;
}

export function RoleDetail({ roleId }: RoleDetailProps) {
  const { data: role } = useQuery(roleDetailOptions(roleId));

  if (!role) return null;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{role.name}</h2>
          {role.isSystem && <SystemBadge />}
          {role.isDefault && <DefaultBadge />}
        </div>
        {role.description && (
          <p className="mt-1 text-sm text-muted-foreground">
            {role.description}
          </p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          할당된 사용자: {role.userCount}명
        </p>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-medium">권한 매트릭스</h3>
        <PermissionMatrix
          roleId={role.id}
          permissions={
            role.permissions as Record<string, Record<string, boolean>>
          }
          isSystem={role.isSystem}
        />
      </div>
    </div>
  );
}
