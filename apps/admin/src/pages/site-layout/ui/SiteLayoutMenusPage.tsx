import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { hasPermission } from '@/entities/auth/lib/checkPermission';
import { requireAuth } from '@/entities/auth/lib/getCurrentUser';
import { menuSetListOptions } from '@/features/navigation-management/api/navigationQueries';
import { NavigationListClient } from '@/pages/navigation-management/ui/NavigationListClient';
import { SiteLayoutNav } from '@/features/site-layout/ui/SiteLayoutNav';
import { getQueryClient } from '@/shared/api/queryClient';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryStateMessage } from '@/shared/ui/QueryStateMessage';

const SITE_LAYOUT_MENU_PATH = '/site-layout/menus';

export default async function SiteLayoutMenusPage() {
  const user = await requireAuth();
  const canReadNavigation = hasPermission(user, 'navigation', 'read');
  const canCreate = hasPermission(user, 'navigation', 'create');

  const queryClient = getQueryClient();
  if (canReadNavigation) {
    await queryClient.prefetchQuery(menuSetListOptions());
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="사이트 화면 관리"
        description="공개 웹 헤더, 메뉴, 푸터 구성을 관리합니다."
        tabs={<SiteLayoutNav />}
      />

      {!canReadNavigation ? (
        <QueryStateMessage
          title="메뉴 관리 권한이 없습니다."
          tone="destructive"
        />
      ) : (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">메뉴 관리</h2>
            <p className="text-sm text-muted-foreground">
              HEADER, FOOTER, 우측 사이드바 슬롯에 배치할 메뉴 세트를 관리합니다.
            </p>
          </div>
          <HydrationBoundary state={dehydrate(queryClient)}>
            <NavigationListClient
              canCreate={canCreate}
              editBasePath={SITE_LAYOUT_MENU_PATH}
              createRedirectBasePath={SITE_LAYOUT_MENU_PATH}
              deleteRedirectPath={SITE_LAYOUT_MENU_PATH}
            />
          </HydrationBoundary>
        </div>
      )}
    </div>
  );
}
