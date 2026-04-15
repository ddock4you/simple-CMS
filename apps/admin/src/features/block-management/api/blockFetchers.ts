import type {
  CreatePageBlockDto,
  PageBlockDetail,
  PageBlockListItem,
  ReorderPageBlocksDto,
  UpdatePageBlockDto,
} from '@simple-cms/types';

import { fetchClient } from '@/shared/api/fetchClient';

export function getBlocks(subpageId: string): Promise<PageBlockListItem[]> {
  return fetchClient<PageBlockListItem[]>(
    `/api/subpages/${subpageId}/blocks`,
  );
}

export function getBlock(
  subpageId: string,
  blockId: string,
): Promise<PageBlockDetail> {
  return fetchClient<PageBlockDetail>(
    `/api/subpages/${subpageId}/blocks/${blockId}`,
  );
}

export function createBlock(
  subpageId: string,
  data: CreatePageBlockDto,
): Promise<{ id: string }> {
  return fetchClient<{ id: string }>(`/api/subpages/${subpageId}/blocks`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateBlock(
  subpageId: string,
  blockId: string,
  data: UpdatePageBlockDto,
): Promise<null> {
  return fetchClient<null>(
    `/api/subpages/${subpageId}/blocks/${blockId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    },
  );
}

export function deleteBlock(
  subpageId: string,
  blockId: string,
): Promise<null> {
  return fetchClient<null>(
    `/api/subpages/${subpageId}/blocks/${blockId}`,
    { method: 'DELETE' },
  );
}

export function reorderBlocks(
  subpageId: string,
  data: ReorderPageBlocksDto,
): Promise<null> {
  return fetchClient<null>(
    `/api/subpages/${subpageId}/blocks/reorder`,
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    },
  );
}
