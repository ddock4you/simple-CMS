import { queryOptions } from '@tanstack/react-query';

import type { UserListFilters } from '@/features/user-management/model/userFilters';
import {
  getUserList,
  getRoleList,
} from '@/features/user-management/api/userFetchers';

export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: UserListFilters) => [...userKeys.lists(), filters] as const,
};

export const roleKeys = {
  all: ['roles'] as const,
  list: () => [...roleKeys.all, 'list'] as const,
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
