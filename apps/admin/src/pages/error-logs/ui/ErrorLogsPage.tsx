import { Suspense } from 'react';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { requireAuth } from '@/entities/auth/lib/getCurrentUser';
import { getQueryClient } from '@/shared/api/queryClient';
import { PageHeader } from '@/shared/ui/PageHeader';
import { PageToolbar } from '@/shared/ui/PageToolbar';
import { errorLogListOptions } from '@/features/error-log/api/errorLogQueries';
import type {
  ErrorLevelFilter,
  ErrorLogListFilters,
  ErrorSourceFilter,
  ResolvedFilter,
} from '@/features/error-log/model/errorLogFilters';
import { toKstDateKey } from '@/shared/lib/kstDate';
import { ErrorLogFilters } from '@/features/error-log/ui/ErrorLogFilters';
import { ErrorLogTable } from '@/features/error-log/ui/ErrorLogTable';

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
): ErrorLogListFilters {
  const defaults = getDefaultDateRange();
  return {
    level: ((searchParams.level as string) || 'ALL') as ErrorLevelFilter,
    source: ((searchParams.source as string) || 'ALL') as ErrorSourceFilter,
    resolved: ((searchParams.resolved as string) ||
      'unresolved') as ResolvedFilter,
    urlPattern: (searchParams.urlPattern as string) || null,
    search: (searchParams.search as string) || null,
    groupByFingerprint: searchParams.groupByFingerprint === 'true',
    from: (searchParams.from as string) || defaults.from,
    to: (searchParams.to as string) || defaults.to,
    page: Number(searchParams.page) || 1,
    pageSize: Number(searchParams.pageSize) || 20,
  };
}

export default async function ErrorLogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAuth();
  const params = await searchParams;
  const filters = parseFilters(params);

  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(errorLogListOptions(filters));

  return (
    <div className="space-y-6">
      <PageHeader
        title="에러 로그"
        description="공개 웹에서 발생한 런타임 에러를 조회하고 해결 처리합니다."
      />
      <PageToolbar
        left={
          <Suspense>
            <ErrorLogFilters
              currentLevel={filters.level}
              currentSource={filters.source}
              currentResolved={filters.resolved}
              currentUrlPattern={filters.urlPattern}
              currentSearch={filters.search}
              currentGroupByFingerprint={filters.groupByFingerprint}
              currentFrom={filters.from}
              currentTo={filters.to}
            />
          </Suspense>
        }
        mobileLeftLabel="필터"
      />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <ErrorLogTable filters={filters} />
      </HydrationBoundary>
    </div>
  );
}
