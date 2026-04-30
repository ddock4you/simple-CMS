import Link from 'next/link';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { Plus } from 'lucide-react';

import { requireAuth } from '@/entities/auth/lib/getCurrentUser';
import { hasPermission } from '@/entities/auth/lib/checkPermission';
import { getQueryClient } from '@/shared/api/queryClient';
import { Button } from '@/shared/ui/shadcn/button';
import { PageHeader } from '@/shared/ui/PageHeader';
import { PageToolbar } from '@/shared/ui/PageToolbar';
import { homePopupListOptions } from '@/features/popup-management/api/popupQueries';
import { PopupList } from '@/features/popup-management/ui/PopupList';

export default async function PopupListPage() {
  const user = await requireAuth();
  const canCreate = hasPermission(user, 'home-popups', 'create');

  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(homePopupListOptions());

  return (
    <div className="space-y-6">
      <PageHeader
        title="메인 팝업"
        description="공개 웹 메인 페이지에 노출되는 팝업을 관리합니다. 드래그하여 순서를 바꿀 수 있습니다."
      />
      <PageToolbar
        right={
          canCreate ? (
            <Button nativeButton={false} render={<Link href="/home/popups/new" />}>
              <Plus className="size-4" />
              새 팝업
            </Button>
          ) : undefined
        }
        mobileCollapseRight={false}
      />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <PopupList />
      </HydrationBoundary>
    </div>
  );
}
