import { queryOptions } from '@tanstack/react-query';

import { blockKeys } from '@/shared/api/queryKeys';

import { getBlock, getBlocks } from './blockFetchers';

export const blockListOptions = (subpageId: string) =>
  queryOptions({
    queryKey: blockKeys.lists(subpageId),
    queryFn: () => getBlocks(subpageId),
    enabled: !!subpageId,
  });

export const blockDetailOptions = (
  subpageId: string,
  blockId: string | null,
) =>
  queryOptions({
    queryKey: blockKeys.detail(subpageId, blockId ?? ''),
    queryFn: () => getBlock(subpageId, blockId as string),
    enabled: !!subpageId && !!blockId,
  });
