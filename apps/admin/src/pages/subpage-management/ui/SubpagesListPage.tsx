import { Suspense } from 'react';
import Link from 'next/link';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { Plus } from 'lucide-react';

import { requireAuth } from '@/entities/auth/lib/getCurrentUser';
import { hasPermission } from '@/entities/auth/lib/checkPermission';
import { getQueryClient } from '@/shared/api/queryClient';
import { Button } from '@/shared/ui/shadcn/button';
import { PageHeader } from '@/shared/ui/PageHeader';
import { PageToolbar } from '@/shared/ui/PageToolbar';
import { subpageListOptions } from '@/features/subpage-management/api/subpageQueries';
import type {
  SubpageListFilters,
  SubpageStatusFilter,
} from '@/features/subpage-management/model/subpageFilters';
import { SubpageStatusFilter as StatusFilter } from '@/features/subpage-management/ui/SubpageStatusFilter';
import { SubpageTable } from '@/features/subpage-management/ui/SubpageTable';

function parseFilters(
  searchParams: Record<string, string | string[] | undefined>,
): SubpageListFilters {
  const status = (searchParams.status as SubpageStatusFilter) || 'ALL';
  const page = Number(searchParams.page) || 1;
  const pageSize = Number(searchParams.pageSize) || 20;

  return { status, page, pageSize };
}

export default async function SubpagesListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAuth();
  const canCreate = hasPermission(user, 'subpages', 'create');
  const params = await searchParams;
  const filters = parseFilters(params);

  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(subpageListOptions(filters));

  return (
    <div className="space-y-6">
      <PageHeader
        title="서브 페이지"
        description="서브 페이지를 관리합니다."
      />
      <PageToolbar
        left={
          <Suspense>
            <StatusFilter currentStatus={filters.status} />
          </Suspense>
        }
        right={
          canCreate ? (
            <Button nativeButton={false} render={<Link href="/subpages/new" />}>
              <Plus className="size-4" />
              새 서브 페이지
            </Button>
          ) : undefined
        }
        mobileLeftLabel="상태 필터"
        mobileRightLabel="새 페이지"
        mobileCollapseRight={false}
      />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <SubpageTable filters={filters} />
      </HydrationBoundary>
    </div>
  );
}
