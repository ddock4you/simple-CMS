import type { ResourceKey, Action, PermissionMap } from '@simple-cms/types';

import type { SessionUser } from '@/entities/auth/model/auth.types';

export function hasPermission(
  user: SessionUser | null,
  resource: ResourceKey,
  action: Action,
): boolean {
  if (!user?.role) return false;
  if (user.role.isSystem) return true;

  const permissions = user.role.permissions as PermissionMap;
  return permissions?.[resource]?.[action] === true;
}
