import { Suspense } from 'react';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { requireAuth } from '@/entities/auth/lib/getCurrentUser';
import { getQueryClient } from '@/shared/api/queryClient';
import { PageHeader } from '@/shared/ui/PageHeader';
import { PageToolbar } from '@/shared/ui/PageToolbar';
import { auditLogListOptions, userOptionsQuery } from '@/features/audit-log/api/auditLogQueries';
import type {
  AuditLogListFilters,
  AuditActionFilter,
} from '@/features/audit-log/model/auditLogFilters';
import { toKstDateKey } from '@/shared/lib/kstDate';
import { AuditLogFilters } from '@/features/audit-log/ui/AuditLogFilters';
import { AuditLogTable } from '@/features/audit-log/ui/AuditLogTable';
import { AuditLogExport } from '@/features/audit-log/ui/AuditLogExport';

function getDefaultDateRange() {
  const to = new Date();
  const from = new Date();
  from.setMonth(from.getMonth() - 1);
  return {
    from: toKstDateKey(from),
    to: toKstDateKey(to),
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
    q:
      typeof searchParams.q === 'string' && searchParams.q.trim()
        ? searchParams.q.trim()
        : undefined,
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
      <PageHeader title="활동 이력" description="관리자 활동 이력을 조회합니다." />
      <PageToolbar
        left={
          <Suspense>
            <AuditLogFilters
              currentAction={filters.action}
              currentEntityType={filters.entityType}
              currentUserId={filters.userId}
              currentFrom={filters.from}
              currentTo={filters.to}
              currentQ={filters.q ?? ''}
            />
          </Suspense>
        }
        right={
          <AuditLogExport
            action={filters.action}
            entityType={filters.entityType}
            userId={filters.userId}
            from={filters.from}
            to={filters.to}
            q={filters.q}
          />
        }
        mobileLeftLabel="필터"
        mobileRightLabel="내보내기"
        mobileCollapseRight={false}
      />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <AuditLogTable filters={filters} />
      </HydrationBoundary>
    </div>
  );
}
