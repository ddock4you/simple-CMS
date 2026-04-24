import type {
  SubpageVersionDetail,
  SubpageVersionListResponse,
} from '@simple-cms/types';

import { fetchClient } from '@/shared/api/fetchClient';

import type { SubpageVersionListFilters } from '../model/versionFilters';
import type {
  CreateVersionData,
  RollbackVersionData,
} from '../model/versionSchemas';

export function getSubpageVersionList(
  subpageId: string,
  filters: SubpageVersionListFilters,
): Promise<SubpageVersionListResponse> {
  const params = new URLSearchParams();
  if (filters.authorId) params.set('authorId', filters.authorId);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.pinnedOnly) params.set('pinnedOnly', 'true');
  if (filters.source) params.set('source', filters.source);
  params.set('page', String(filters.page));
  params.set('pageSize', String(filters.pageSize));

  return fetchClient<SubpageVersionListResponse>(
    `/api/subpages/${subpageId}/versions?${params.toString()}`,
  );
}

export function getSubpageVersionDetail(
  subpageId: string,
  versionId: string,
): Promise<SubpageVersionDetail> {
  return fetchClient<SubpageVersionDetail>(
    `/api/subpages/${subpageId}/versions/${versionId}`,
  );
}

export function createSubpageVersion(
  subpageId: string,
  data: CreateVersionData,
): Promise<{ id: string }> {
  return fetchClient<{ id: string }>(`/api/subpages/${subpageId}/versions`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateSubpageVersionPin(
  subpageId: string,
  versionId: string,
  isPinned: boolean,
): Promise<null> {
  return fetchClient<null>(
    `/api/subpages/${subpageId}/versions/${versionId}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ isPinned }),
    },
  );
}

export function deleteSubpageVersion(
  subpageId: string,
  versionId: string,
): Promise<null> {
  return fetchClient<null>(
    `/api/subpages/${subpageId}/versions/${versionId}`,
    { method: 'DELETE' },
  );
}

export interface RollbackResponse {
  preRollbackVersionId: string;
  newRevision: number;
}

export function rollbackSubpageVersion(
  subpageId: string,
  versionId: string,
  data: RollbackVersionData,
): Promise<RollbackResponse> {
  return fetchClient<RollbackResponse>(
    `/api/subpages/${subpageId}/versions/${versionId}/rollback`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  );
}
