import { queryOptions } from '@tanstack/react-query';

import { auditLogKeys } from '@/shared/api/queryKeys';
import type { AuditLogListFilters } from '../model/auditLogFilters';
import { getAuditLogList, getUserOptions } from './auditLogFetchers';

export const auditLogListOptions = (filters: AuditLogListFilters) =>
  queryOptions({
    queryKey: auditLogKeys.list(filters),
    queryFn: () => getAuditLogList(filters),
  });

export const userOptionsQuery = () =>
  queryOptions({
    queryKey: ['users', 'options'] as const,
    queryFn: () => getUserOptions(),
    staleTime: 5 * 60 * 1000,
  });
