import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { requireAuth } from '@/entities/auth/lib/getCurrentUser';
import { getQueryClient } from '@/shared/api/queryClient';
import {
  homePopupDetailOptions,
  homePopupReferencesOptions,
} from '@/features/popup-management/api/popupQueries';
import { PopupForm } from '@/features/popup-management/ui/PopupForm';

import { PopupEditClient } from './PopupEditClient';

interface Props {
  mode: 'create' | 'edit';
  id?: string;
}

export default async function PopupEditPage({ mode, id }: Props) {
  await requireAuth();

  const queryClient = getQueryClient();
  // LinkTargetInput 드롭다운용 references는 항상 prefetch
  await queryClient.prefetchQuery(homePopupReferencesOptions());

  if (mode === 'create') {
    return (
      <HydrationBoundary state={dehydrate(queryClient)}>
        <PopupForm mode="create" />
      </HydrationBoundary>
    );
  }

  await queryClient.prefetchQuery(homePopupDetailOptions(id!));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PopupEditClient id={id!} />
    </HydrationBoundary>
  );
}
