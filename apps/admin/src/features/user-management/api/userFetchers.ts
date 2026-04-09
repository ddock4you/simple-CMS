import type { PaginatedResponse } from '@simple-cms/types';

import { fetchClient } from '@/shared/api/fetchClient';
import type {
  UserListFilters,
  UserListItem,
  RoleListItem,
} from '@/features/user-management/model/userFilters';

export function getUserList(
  filters: UserListFilters,
): Promise<PaginatedResponse<UserListItem>> {
  const params = new URLSearchParams();
  if (filters.status !== 'ALL') params.set('status', filters.status);
  params.set('page', String(filters.page));
  params.set('pageSize', String(filters.pageSize));

  return fetchClient<PaginatedResponse<UserListItem>>(
    `/api/users?${params.toString()}`,
  );
}

export function getRoleList(): Promise<RoleListItem[]> {
  return fetchClient<RoleListItem[]>('/api/roles');
}

export function approveUser(id: string): Promise<null> {
  return fetchClient<null>(`/api/users/${id}/approve`, { method: 'POST' });
}

export function rejectUser(id: string): Promise<null> {
  return fetchClient<null>(`/api/users/${id}`, { method: 'DELETE' });
}

export function suspendUser(id: string): Promise<null> {
  return fetchClient<null>(`/api/users/${id}/suspend`, { method: 'POST' });
}

export function reactivateUser(id: string): Promise<null> {
  return fetchClient<null>(`/api/users/${id}/reactivate`, { method: 'POST' });
}

export function changeUserRole(id: string, roleId: string): Promise<null> {
  return fetchClient<null>(`/api/users/${id}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ roleId }),
  });
}
