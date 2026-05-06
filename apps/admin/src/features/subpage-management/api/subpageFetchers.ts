import type { PaginatedResponse } from '@simple-cms/types';
import type { ContentStatus } from '@simple-cms/db';

import { fetchClient } from '@/shared/api/fetchClient';

import type {
  SubpageListFilters,
  SubpageListItem,
  SubpageDetail,
} from '../model/subpageFilters';
import type { CreateSubpageData, UpdateSubpageData } from '../model/subpageSchemas';

export function getSubpageList(
  filters: SubpageListFilters,
): Promise<PaginatedResponse<SubpageListItem>> {
  const params = new URLSearchParams();
  if (filters.status !== 'ALL') params.set('status', filters.status);
  params.set('page', String(filters.page));
  params.set('pageSize', String(filters.pageSize));
  if (filters.q) params.set('q', filters.q);

  return fetchClient<PaginatedResponse<SubpageListItem>>(
    `/api/subpages?${params.toString()}`,
  );
}

export function getSubpageDetail(id: string): Promise<SubpageDetail> {
  return fetchClient<SubpageDetail>(`/api/subpages/${id}`);
}

export function createSubpage(data: CreateSubpageData): Promise<{ id: string }> {
  return fetchClient<{ id: string }>('/api/subpages', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateSubpage(
  id: string,
  data: UpdateSubpageData,
): Promise<null> {
  return fetchClient<null>(`/api/subpages/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteSubpage(id: string): Promise<null> {
  return fetchClient<null>(`/api/subpages/${id}`, { method: 'DELETE' });
}

export function toggleSubpageStatus(
  id: string,
  status: ContentStatus,
): Promise<null> {
  return fetchClient<null>(`/api/subpages/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export interface BulkDeleteSubpageResponse {
  deleted: string[];
  blocked: Array<{ id: string; title: string; reason: string }>;
}

export interface BulkStatusSubpageResponse {
  updated: string[];
  failed: Array<{ id: string; reason: string }>;
}

export function bulkDeleteSubpages(
  ids: string[],
): Promise<BulkDeleteSubpageResponse> {
  return fetchClient<BulkDeleteSubpageResponse>('/api/subpages/bulk-delete', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
}

export function bulkUpdateSubpageStatus(
  ids: string[],
  status: ContentStatus,
): Promise<BulkStatusSubpageResponse> {
  return fetchClient<BulkStatusSubpageResponse>('/api/subpages/bulk-status', {
    method: 'POST',
    body: JSON.stringify({ ids, status }),
  });
}
