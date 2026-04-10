import { Suspense } from 'react';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { requireAuth } from '@/entities/auth/lib/getCurrentUser';
import { getQueryClient } from '@/shared/api/queryClient';
import { auditLogListOptions, userOptionsQuery } from '@/features/audit-log/api/auditLogQueries';
import type {
  AuditLogListFilters,
  AuditActionFilter,
} from '@/features/audit-log/model/auditLogFilters';
import { AuditLogFilters } from '@/features/audit-log/ui/AuditLogFilters';
import { AuditLogTable } from '@/features/audit-log/ui/AuditLogTable';
import { AuditLogExport } from '@/features/audit-log/ui/AuditLogExport';

function getDefaultDateRange() {
  const to = new Date();
  const from = new Date();
  from.setMonth(from.getMonth() - 1);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

function parseFilters(
  searchParams: Record<string, string | string[] | undefined>,
): AuditLogListFilters {
  const defaults = getDefaultDateRange();
  return {
    action: ((searchParams.action as string) || 'ALL') as AuditActionFilter,
    entityType: (searchParams.entityType as string) || null,
    userId: (searchParams.userId as string) || null,
    from: (searchParams.from as string) || defaults.from,
    to: (searchParams.to as string) || defaults.to,
    page: Number(searchParams.page) || 1,
    pageSize: Number(searchParams.pageSize) || 20,
  };
}

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAuth();
  const params = await searchParams;
  const filters = parseFilters(params);

  const queryClient = getQueryClient();
  await Promise.all([
    queryClient.prefetchQuery(auditLogListOptions(filters)),
    queryClient.prefetchQuery(userOptionsQuery()),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">활동 이력</h1>
          <p className="text-muted-foreground">
            관리자 활동 이력을 조회합니다.
          </p>
        </div>
      </div>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <div className="space-y-4">
          <Suspense>
            <AuditLogFilters
              currentAction={filters.action}
              currentEntityType={filters.entityType}
              currentUserId={filters.userId}
              currentFrom={filters.from}
              currentTo={filters.to}
            />
          </Suspense>
          <div className="flex justify-end">
            <AuditLogExport />
          </div>
          <AuditLogTable filters={filters} />
        </div>
      </HydrationBoundary>
    </div>
  );
}
