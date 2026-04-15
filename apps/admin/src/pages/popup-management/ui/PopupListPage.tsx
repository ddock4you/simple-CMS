import Link from 'next/link';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { Plus } from 'lucide-react';

import { requireAuth } from '@/entities/auth/lib/getCurrentUser';
import { hasPermission } from '@/entities/auth/lib/checkPermission';
import { getQueryClient } from '@/shared/api/queryClient';
import { Button } from '@/shared/ui/shadcn/button';
import { homePopupListOptions } from '@/features/popup-management/api/popupQueries';
import { PopupList } from '@/features/popup-management/ui/PopupList';

export default async function PopupListPage() {
  const user = await requireAuth();
  const canCreate = hasPermission(user, 'home-popups', 'create');

  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(homePopupListOptions());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">메인 팝업</h1>
          <p className="text-muted-foreground">
            공개 웹 메인 페이지에 노출되는 팝업을 관리합니다. 드래그하여 순서를 바꿀 수
            있습니다.
          </p>
        </div>
        {canCreate && (
          <Button
            nativeButton={false}
            render={<Link href="/home/popups/new" />}
          >
            <Plus className="size-4" />새 팝업
          </Button>
        )}
      </div>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <PopupList />
      </HydrationBoundary>
    </div>
  );
}
