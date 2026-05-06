import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { requireAuth } from '@/entities/auth/lib/getCurrentUser';
import { hasPermission } from '@/entities/auth/lib/checkPermission';
import { getQueryClient } from '@/shared/api/queryClient';
import { PageHeader } from '@/shared/ui/PageHeader';
import { homePopupListOptions } from '@/features/popup-management/api/popupQueries';
import { PopupListClient } from '@/features/popup-management/ui/PopupListClient';

export default async function PopupListPage() {
  const user = await requireAuth();
  const canCreate = hasPermission(user, 'home-popups', 'create');
  const canUpdate = hasPermission(user, 'home-popups', 'update');

  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(homePopupListOptions());

  return (
    <div className="space-y-6">
      <PageHeader
        title="메인 팝업"
        description="공개 웹 메인 페이지에 노출되는 팝업을 관리합니다. 드래그하여 순서를 바꿀 수 있습니다."
      />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <PopupListClient canCreate={canCreate} canUpdate={canUpdate} />
      </HydrationBoundary>
    </div>
  );
}
