import type { PaginatedResponse } from '@simple-cms/types';

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
