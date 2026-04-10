import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { requireAuth } from '@/entities/auth/lib/getCurrentUser';
import { getQueryClient } from '@/shared/api/queryClient';
import { boardDetailOptions } from '@/features/board-management/api/boardQueries';
import { BoardView } from '@/features/board-management/ui/BoardView';

interface BoardViewPageProps {
  id: string;
}

export default async function BoardViewPage({ id }: BoardViewPageProps) {
  await requireAuth();

  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(boardDetailOptions(id));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <BoardView id={id} />
    </HydrationBoundary>
  );
}
