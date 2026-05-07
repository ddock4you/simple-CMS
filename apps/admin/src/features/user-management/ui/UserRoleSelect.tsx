'use client';

import { useQuery } from '@tanstack/react-query';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/shared/ui/Select';
import { roleListOptions } from '@/features/user-management/api/userQueries';
import { useChangeUserRole } from '@/features/user-management/api/useUserMutations';

interface UserRoleSelectProps {
  userId: string;
  currentRoleId: string | null;
  isCurrentUserSystemAdmin: boolean;
}

export function UserRoleSelect({
  userId,
  currentRoleId,
  isCurrentUserSystemAdmin,
}: UserRoleSelectProps) {
  const { data: roles } = useQuery(roleListOptions());
  const changeRole = useChangeUserRole();

  const handleChange = (roleId: string | null) => {
    if (roleId && roleId !== currentRoleId) {
      changeRole.mutate({ userId, roleId });
    }
  };

  const visibleRoles = roles?.filter(
    (role) => !role.isSystem || isCurrentUserSystemAdmin,
  );

  const currentRoleName =
    roles?.find((r) => r.id === currentRoleId)?.name ?? '역할 선택';

  return (
    <Select
      value={currentRoleId ?? ''}
      onValueChange={handleChange}
      disabled={changeRole.isPending}
    >
      <SelectTrigger className="h-8 w-32">
        <span className="truncate">{currentRoleName}</span>
      </SelectTrigger>
      <SelectContent>
        {visibleRoles?.map((role) => (
          <SelectItem key={role.id} value={role.id}>
            {role.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
