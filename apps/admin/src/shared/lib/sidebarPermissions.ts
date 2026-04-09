import type { PermissionMap } from '@simple-cms/types';

import {
  NAV_MAIN,
  NAV_GROUPS,
} from '@/shared/config/navigation';
import type { NavItem, NavGroup } from '@/shared/config/navigation';

interface SidebarUser {
  role: {
    isSystem: boolean;
    permissions: unknown;
  } | null;
}

export function getVisibleMenuItems(user: SidebarUser | null): {
  main: NavItem[];
  groups: NavGroup[];
} {
  const main = NAV_MAIN;

  if (user?.role?.isSystem) {
    return { main, groups: NAV_GROUPS };
  }

  const permissions = (user?.role?.permissions ?? {}) as PermissionMap;

  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (!item.resource) return true;
      return permissions[item.resource]?.read === true;
    }),
  })).filter((group) => group.items.length > 0);

  return { main, groups };
}
