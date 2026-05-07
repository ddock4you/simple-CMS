import { Suspense } from 'react';
import Link from 'next/link';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { Plus } from 'lucide-react';

import { requireAuth } from '@/entities/auth/lib/getCurrentUser';
import { hasPermission } from '@/entities/auth/lib/checkPermission';
import { getQueryClient } from '@/shared/api/queryClient';
import { Button } from '@/shared/ui/Button';
import { PageHeader } from '@/shared/ui/PageHeader';
import { PageToolbar } from '@/shared/ui/PageToolbar';
import { ListSearchInput } from '@/shared/ui/ListSearchInput';
import { postListOptions, boardOptionsQuery } from '@/features/post-management/api/postQueries';
import type {
  PostListFilters,
  PostStatusFilter,
} from '@/features/post-management/model/postFilters';
import { PostStatusFilter as StatusFilter } from '@/features/post-management/ui/PostStatusFilter';
import { PostBoardFilter } from '@/features/post-management/ui/PostBoardFilter';
import { PostTable } from '@/features/post-management/ui/PostTable';

function parseFilters(
  searchParams: Record<string, string | string[] | undefined>,
): PostListFilters {
  const status = (searchParams.status as PostStatusFilter) || 'ALL';
  const boardId = (searchParams.boardId as string) || null;
  const page = Number(searchParams.page) || 1;
  const pageSize = Number(searchParams.pageSize) || 20;
  const q =
    typeof searchParams.q === 'string' && searchParams.q.trim()
      ? searchParams.q.trim()
      : undefined;

  return { status, boardId, page, pageSize, q };
}

export default async function PostsListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAuth();
  const canCreate = hasPermission(user, 'posts', 'create');
  const params = await searchParams;
  const filters = parseFilters(params);

  const queryClient = getQueryClient();
  await Promise.all([
    queryClient.prefetchQuery(postListOptions(filters)),
    queryClient.prefetchQuery(boardOptionsQuery()),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="게시글" description="게시글을 관리합니다." />
      <PageToolbar
        left={
          <div className="flex items-center gap-2">
            <Suspense>
              <StatusFilter currentStatus={filters.status} />
            </Suspense>
            <Suspense>
              <PostBoardFilter currentBoardId={filters.boardId} />
            </Suspense>
            <Suspense>
              <ListSearchInput
                placeholder="제목으로 검색"
                defaultValue={filters.q ?? ''}
              />
            </Suspense>
          </div>
        }
        right={
          canCreate ? (
            <Button nativeButton={false} render={<Link href="/posts/new" />}>
              <Plus className="size-4" />
              새 게시글
            </Button>
          ) : undefined
        }
        mobileLeftLabel="상태 · 게시판"
        mobileRightLabel="새 게시글"
        mobileCollapseRight={false}
      />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <PostTable filters={filters} />
      </HydrationBoundary>
    </div>
  );
}
