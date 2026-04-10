import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { requireAuth } from '@/entities/auth/lib/getCurrentUser';
import { getQueryClient } from '@/shared/api/queryClient';
import { boardDetailOptions } from '@/features/board-management/api/boardQueries';
import { BoardForm } from '@/features/board-management/ui/BoardForm';

import { BoardEditClient } from './BoardEditClient';

interface BoardEditPageProps {
  mode: 'create' | 'edit';
  id?: string;
}

export default async function BoardEditPage({
  mode,
  id,
}: BoardEditPageProps) {
  await requireAuth();

  if (mode === 'create') {
    return <BoardForm mode="create" />;
  }

  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(boardDetailOptions(id!));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <BoardEditClient id={id!} />
    </HydrationBoundary>
  );
}
