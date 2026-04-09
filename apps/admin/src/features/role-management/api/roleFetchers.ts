import { fetchClient } from '@/shared/api/fetchClient';

export interface RoleListItem {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  isDefault: boolean;
  userCount: number;
}

export interface RoleDetail extends RoleListItem {
  permissions: Record<string, Record<string, boolean>>;
  createdAt: string;
  updatedAt: string;
}

export function getRoleListFull(): Promise<RoleListItem[]> {
  return fetchClient<RoleListItem[]>('/api/roles');
}

export function getRoleDetail(id: string): Promise<RoleDetail> {
  return fetchClient<RoleDetail>(`/api/roles/${id}`);
}

export function createRole(data: {
  name: string;
  description?: string;
  permissions: Record<string, Record<string, boolean>>;
}): Promise<unknown> {
  return fetchClient('/api/roles', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateRole(
  id: string,
  data: { name?: string; description?: string },
): Promise<null> {
  return fetchClient<null>(`/api/roles/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteRole(id: string): Promise<null> {
  return fetchClient<null>(`/api/roles/${id}`, { method: 'DELETE' });
}

export function updatePermissions(
  id: string,
  permissions: Record<string, Record<string, boolean>>,
): Promise<null> {
  return fetchClient<null>(`/api/roles/${id}/permissions`, {
    method: 'PATCH',
    body: JSON.stringify({ permissions }),
  });
}

export function setDefaultRole(id: string): Promise<null> {
  return fetchClient<null>(`/api/roles/${id}/set-default`, { method: 'POST' });
}
