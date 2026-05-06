import type { UserStatus } from '@simple-cms/db';

export type UserStatusFilter = UserStatus | 'ALL';

export interface UserListFilters {
  status: UserStatusFilter;
  page: number;
  pageSize: number;
  q?: string;
}

export const DEFAULT_USER_FILTERS: UserListFilters = {
  status: 'ALL',
  page: 1,
  pageSize: 20,
  q: undefined,
};

export interface UserListItem {
  id: string;
  username: string;
  name: string;
  email: string | null;
  status: UserStatus;
  role: { id: string; name: string; isSystem: boolean } | null;
  createdAt: string;
}

export interface RoleListItem {
  id: string;
  name: string;
  isSystem: boolean;
  isDefault: boolean;
}
