import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { requireAuth } from '@/entities/auth/lib/getCurrentUser';
import { getQueryClient } from '@/shared/api/queryClient';
import { subpageDetailOptions } from '@/features/subpage-management/api/subpageQueries';
import { SubpageForm } from '@/features/subpage-management/ui/SubpageForm';

import { SubpageEditClient } from './SubpageEditClient';

interface SubpageEditPageProps {
  mode: 'create' | 'edit';
  id?: string;
}

export default async function SubpageEditPage({
  mode,
  id,
}: SubpageEditPageProps) {
  await requireAuth();

  if (mode === 'create') {
    return <SubpageForm mode="create" />;
  }

  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(subpageDetailOptions(id!));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SubpageEditClient id={id!} />
    </HydrationBoundary>
  );
}
