import { queryOptions } from '@tanstack/react-query';

import { subpageKeys } from '@/shared/api/queryKeys';

import type { SubpageListFilters } from '../model/subpageFilters';
import { getSubpageList, getSubpageDetail } from './subpageFetchers';

export const subpageListOptions = (filters: SubpageListFilters) =>
  queryOptions({
    queryKey: subpageKeys.list(filters),
    queryFn: () => getSubpageList(filters),
  });

export const subpageDetailOptions = (id: string) =>
  queryOptions({
    queryKey: subpageKeys.detail(id),
    queryFn: () => getSubpageDetail(id),
  });
