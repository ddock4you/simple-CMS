import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { requireAuth } from '@/entities/auth/lib/getCurrentUser';
import { getQueryClient } from '@/shared/api/queryClient';
import { subpageDetailOptions } from '@/features/subpage-management/api/subpageQueries';
import { SubpageView } from '@/features/subpage-management/ui/SubpageView';

interface SubpageViewPageProps {
  id: string;
}

export default async function SubpageViewPage({ id }: SubpageViewPageProps) {
  await requireAuth();

  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(subpageDetailOptions(id));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SubpageView id={id} />
    </HydrationBoundary>
  );
}
