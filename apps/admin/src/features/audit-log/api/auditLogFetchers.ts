import type { PaginatedResponse } from '@simple-cms/types';

import { fetchClient } from '@/shared/api/fetchClient';
import type {
  AuditLogListFilters,
  AuditLogListItem,
  UserOption,
} from '../model/auditLogFilters';

export function getAuditLogList(
  filters: AuditLogListFilters,
): Promise<PaginatedResponse<AuditLogListItem>> {
  const params = new URLSearchParams();
  if (filters.action !== 'ALL') params.set('action', filters.action);
  if (filters.entityType) params.set('entityType', filters.entityType);
  if (filters.userId) params.set('userId', filters.userId);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  params.set('page', String(filters.page));
  params.set('pageSize', String(filters.pageSize));

  return fetchClient<PaginatedResponse<AuditLogListItem>>(
    `/api/audit-logs?${params.toString()}`,
  );
}

export async function getUserOptions(): Promise<UserOption[]> {
  const data = await fetchClient<PaginatedResponse<{ id: string; name: string }>>(
    '/api/users?pageSize=100&status=ALL',
  );
  return data.items.map((u) => ({ id: u.id, name: u.name }));
}
