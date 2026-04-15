import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { requireAuth } from '@/entities/auth/lib/getCurrentUser';
import { getQueryClient } from '@/shared/api/queryClient';
import { homePopupDetailOptions } from '@/features/popup-management/api/popupQueries';
import { PopupView } from '@/features/popup-management/ui/PopupView';

interface Props {
  id: string;
}

export default async function PopupViewPage({ id }: Props) {
  await requireAuth();

  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(homePopupDetailOptions(id));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PopupView id={id} />
    </HydrationBoundary>
  );
}
