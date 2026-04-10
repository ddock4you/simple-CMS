import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { requireAuth } from '@/entities/auth/lib/getCurrentUser';
import { getQueryClient } from '@/shared/api/queryClient';
import { postDetailOptions } from '@/features/post-management/api/postQueries';
import { PostView } from '@/features/post-management/ui/PostView';

interface PostViewPageProps {
  id: string;
}

export default async function PostViewPage({ id }: PostViewPageProps) {
  await requireAuth();

  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(postDetailOptions(id));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PostView id={id} />
    </HydrationBoundary>
  );
}
