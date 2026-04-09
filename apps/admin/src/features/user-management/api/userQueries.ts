import { queryOptions } from '@tanstack/react-query';

import type { UserListFilters } from '@/features/user-management/model/userFilters';
import {
  getUserList,
  getRoleList,
} from '@/features/user-management/api/userFetchers';
import {
  userKeys as baseUserKeys,
  roleKeys,
} from '@/shared/api/queryKeys';

export { roleKeys };

export const userKeys = {
  ...baseUserKeys,
  list: (filters: UserListFilters) =>
    [...baseUserKeys.lists(), filters] as const,
};

export const userListOptions = (filters: UserListFilters) =>
  queryOptions({
    queryKey: userKeys.list(filters),
    queryFn: () => getUserList(filters),
  });

export const roleListOptions = () =>
  queryOptions({
    queryKey: roleKeys.list(),
    queryFn: () => getRoleList(),
  });
