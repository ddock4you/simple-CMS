import { Suspense } from 'react';
import Link from 'next/link';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { Plus } from 'lucide-react';

import { requireAuth } from '@/entities/auth/lib/getCurrentUser';
import { hasPermission } from '@/entities/auth/lib/checkPermission';
import { getQueryClient } from '@/shared/api/queryClient';
import { Button } from '@/shared/ui/shadcn/button';
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

  return { status, boardId, page, pageSize };
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">게시글</h1>
          <p className="text-muted-foreground">
            게시글을 관리합니다.
          </p>
        </div>
        {canCreate && (
          <Button nativeButton={false} render={<Link href="/posts/new" />}>
            <Plus className="size-4" />
            새 게시글
          </Button>
        )}
      </div>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <div className="flex items-center gap-4">
          <Suspense>
            <StatusFilter currentStatus={filters.status} />
          </Suspense>
          <Suspense>
            <PostBoardFilter currentBoardId={filters.boardId} />
          </Suspense>
        </div>
        <PostTable filters={filters} />
      </HydrationBoundary>
    </div>
  );
}
