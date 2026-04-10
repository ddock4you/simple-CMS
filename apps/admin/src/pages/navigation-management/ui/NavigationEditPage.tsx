import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { requireAuth } from '@/entities/auth/lib/getCurrentUser';
import { getQueryClient } from '@/shared/api/queryClient';
import {
  menuSetDetailOptions,
  subpageOptionsQuery,
  boardOptionsForNavQuery,
} from '@/features/navigation-management/api/navigationQueries';
import { NavigationEditClient } from './NavigationEditClient';

interface NavigationEditPageProps {
  menuId: string;
}

export default async function NavigationEditPage({ menuId }: NavigationEditPageProps) {
  await requireAuth();

  const queryClient = getQueryClient();
  await Promise.all([
    queryClient.prefetchQuery(menuSetDetailOptions(menuId)),
    queryClient.prefetchQuery(subpageOptionsQuery()),
    queryClient.prefetchQuery(boardOptionsForNavQuery()),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <NavigationEditClient menuId={menuId} />
    </HydrationBoundary>
  );
}
