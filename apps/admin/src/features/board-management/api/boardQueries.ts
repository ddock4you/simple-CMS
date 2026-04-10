import { queryOptions } from '@tanstack/react-query';

import { boardKeys } from '@/shared/api/queryKeys';
import type { BoardListFilters } from '../model/boardFilters';
import { getBoardList, getBoardDetail } from './boardFetchers';

export const boardListOptions = (filters: BoardListFilters) =>
  queryOptions({
    queryKey: boardKeys.list(filters),
    queryFn: () => getBoardList(filters),
  });

export const boardDetailOptions = (id: string) =>
  queryOptions({
    queryKey: boardKeys.detail(id),
    queryFn: () => getBoardDetail(id),
  });
