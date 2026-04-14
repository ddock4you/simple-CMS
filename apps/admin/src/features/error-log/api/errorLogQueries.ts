import { queryOptions } from '@tanstack/react-query';

import { errorLogKeys } from '@/shared/api/queryKeys';

import type { ErrorLogListFilters } from '../model/errorLogFilters';
import { getErrorLogDetail, getErrorLogList } from './errorLogFetchers';

export const errorLogListOptions = (filters: ErrorLogListFilters) =>
  queryOptions({
    queryKey: errorLogKeys.list(filters),
    queryFn: () => getErrorLogList(filters),
  });

export const errorLogDetailOptions = (id: string | null) =>
  queryOptions({
    queryKey: errorLogKeys.detail(id ?? ''),
    queryFn: () => getErrorLogDetail(id as string),
    enabled: !!id,
  });
