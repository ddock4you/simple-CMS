import type { PaginatedResponse } from '@simple-cms/types';

import { fetchClient } from '@/shared/api/fetchClient';
import type {
  UserListFilters,
  UserListItem,
  RoleListItem,
} from '@/features/user-management/model/userFilters';

export interface BulkUserBlockedItem {
  id: string;
  username: string;
  reason: string;
}

export interface BulkUserUpdateResult {
  updated: string[];
  blocked: BulkUserBlockedItem[];
}

export interface BulkUserDeleteResult {
  deleted: string[];
  blocked: BulkUserBlockedItem[];
}

export function getUserList(
  filters: UserListFilters,
): Promise<PaginatedResponse<UserListItem>> {
  const params = new URLSearchParams();
  if (filters.status !== 'ALL') params.set('status', filters.status);
  params.set('page', String(filters.page));
  params.set('pageSize', String(filters.pageSize));
  if (filters.q) params.set('q', filters.q);

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

export function bulkApproveUsers(ids: string[]): Promise<BulkUserUpdateResult> {
  return fetchClient<BulkUserUpdateResult>('/api/users/bulk-approve', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
}

export function bulkRejectUsers(ids: string[]): Promise<BulkUserDeleteResult> {
  return fetchClient<BulkUserDeleteResult>('/api/users/bulk-reject', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
}

export function bulkSuspendUsers(ids: string[]): Promise<BulkUserUpdateResult> {
  return fetchClient<BulkUserUpdateResult>('/api/users/bulk-suspend', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
}

export function bulkReactivateUsers(ids: string[]): Promise<BulkUserUpdateResult> {
  return fetchClient<BulkUserUpdateResult>('/api/users/bulk-reactivate', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
}

export function bulkChangeUserRole(ids: string[], roleId: string): Promise<BulkUserUpdateResult> {
  return fetchClient<BulkUserUpdateResult>('/api/users/bulk-role', {
    method: 'POST',
    body: JSON.stringify({ ids, roleId }),
  });
}
