import type { PaginatedResponse } from '@simple-cms/types';

import { fetchClient } from '@/shared/api/fetchClient';
import type {
  ErrorLogDetail,
  ErrorLogListFilters,
  ErrorLogRow,
} from '../model/errorLogFilters';

export function getErrorLogList(
  filters: ErrorLogListFilters,
): Promise<PaginatedResponse<ErrorLogRow>> {
  const params = new URLSearchParams();
  if (filters.level !== 'ALL') params.set('level', filters.level);
  if (filters.source !== 'ALL') params.set('source', filters.source);
  if (filters.resolved !== 'all') params.set('resolved', filters.resolved);
  if (filters.urlPattern) params.set('urlPattern', filters.urlPattern);
  if (filters.search) params.set('search', filters.search);
  if (filters.groupByFingerprint)
    params.set('groupByFingerprint', 'true');
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  params.set('page', String(filters.page));
  params.set('pageSize', String(filters.pageSize));

  return fetchClient<PaginatedResponse<ErrorLogRow>>(
    `/api/error-logs?${params.toString()}`,
  );
}

export function getErrorLogDetail(id: string): Promise<ErrorLogDetail> {
  return fetchClient<ErrorLogDetail>(`/api/error-logs/${id}`);
}

export function setErrorLogResolved(
  id: string,
  isResolved: boolean,
): Promise<null> {
  return fetchClient<null>(`/api/error-logs/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isResolved }),
  });
}

export function bulkResolveByFingerprint(
  fingerprint: string,
  isResolved: boolean,
): Promise<{ count: number }> {
  return fetchClient<{ count: number }>(`/api/error-logs/bulk-resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fingerprint, isResolved }),
  });
}
