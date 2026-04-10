import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { requireAuth } from '@/entities/auth/lib/getCurrentUser';
import { getQueryClient } from '@/shared/api/queryClient';
import { postDetailOptions, boardOptionsQuery } from '@/features/post-management/api/postQueries';
import { PostForm } from '@/features/post-management/ui/PostForm';

import { PostEditClient } from './PostEditClient';

interface PostEditPageProps {
  mode: 'create' | 'edit';
  id?: string;
  defaultBoardId?: string;
}

export default async function PostEditPage({
  mode,
  id,
  defaultBoardId,
}: PostEditPageProps) {
  await requireAuth();

  const queryClient = getQueryClient();

  if (mode === 'create') {
    await queryClient.prefetchQuery(boardOptionsQuery());
    return (
      <HydrationBoundary state={dehydrate(queryClient)}>
        <PostForm mode="create" defaultBoardId={defaultBoardId} />
      </HydrationBoundary>
    );
  }

  await Promise.all([
    queryClient.prefetchQuery(postDetailOptions(id!)),
    queryClient.prefetchQuery(boardOptionsQuery()),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PostEditClient id={id!} />
    </HydrationBoundary>
  );
}
