import { Suspense } from 'react';
import { AdminLink as Link } from '@/shared/ui/AdminLink';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { Plus } from 'lucide-react';

import { requireAuth } from '@/entities/auth/lib/getCurrentUser';
import { hasPermission } from '@/entities/auth/lib/checkPermission';
import { getQueryClient } from '@/shared/api/queryClient';
import { Button } from '@/shared/ui/Button';
import { PageHeader } from '@/shared/ui/PageHeader';
import { PageToolbar } from '@/shared/ui/PageToolbar';
import { ListSearchInput } from '@/shared/ui/ListSearchInput';
import { boardListOptions } from '@/features/board-management/api/boardQueries';
import type {
  BoardListFilters,
  BoardVisibilityFilter,
} from '@/features/board-management/model/boardFilters';
import { BoardVisibilityFilter as VisibilityFilter } from '@/features/board-management/ui/BoardVisibilityFilter';
import { BoardTable } from '@/features/board-management/ui/BoardTable';

function parseFilters(
  searchParams: Record<string, string | string[] | undefined>,
): BoardListFilters {
  const visibility = (searchParams.visibility as BoardVisibilityFilter) || 'ALL';
  const page = Number(searchParams.page) || 1;
  const pageSize = Number(searchParams.pageSize) || 20;
  const q =
    typeof searchParams.q === 'string' && searchParams.q.trim()
      ? searchParams.q.trim()
      : undefined;

  return { visibility, page, pageSize, q };
}

export default async function BoardsListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAuth();
  const canCreate = hasPermission(user, 'boards', 'create');
  const params = await searchParams;
  const filters = parseFilters(params);

  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(boardListOptions(filters));

  return (
    <div className="space-y-6">
      <PageHeader title="게시판" description="게시판을 관리합니다." />
      <PageToolbar
        left={
          <div className="flex items-center gap-2">
            <Suspense>
              <VisibilityFilter currentVisibility={filters.visibility} />
            </Suspense>
            <Suspense>
              <ListSearchInput
                placeholder="이름/슬러그로 검색"
                defaultValue={filters.q ?? ''}
              />
            </Suspense>
          </div>
        }
        right={
          canCreate ? (
            <Button nativeButton={false} render={<Link href="/boards/new" />}>
              <Plus className="size-4" />
              새 게시판
            </Button>
          ) : undefined
        }
        mobileLeftLabel="공개 여부"
        mobileRightLabel="새 게시판"
        mobileCollapseRight={false}
      />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <BoardTable filters={filters} />
      </HydrationBoundary>
    </div>
  );
}
