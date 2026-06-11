import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { hasPermission } from '@/entities/auth/lib/checkPermission';
import { requireAuth } from '@/entities/auth/lib/getCurrentUser';
import { menuSetListOptions } from '@/features/navigation-management/api/navigationQueries';
import { footerSettingsOptions } from '@/features/site-settings/api/settingsQueries';
import { FooterSettingsForm } from '@/features/site-settings/ui/FooterSettingsForm';
import { SiteLayoutNav } from '@/features/site-layout/ui/SiteLayoutNav';
import { SlotMenuToolbarAction } from '@/features/site-layout/ui/SlotMenuToolbarAction';
import { getQueryClient } from '@/shared/api/queryClient';
import { PageHeader } from '@/shared/ui/PageHeader';
import { PageToolbar } from '@/shared/ui/PageToolbar';
import { QueryStateMessage } from '@/shared/ui/QueryStateMessage';

export default async function SiteLayoutFooterPage() {
  const user = await requireAuth();
  const canReadSettings = hasPermission(user, 'settings', 'read');
  const canReadNavigation = hasPermission(user, 'navigation', 'read');

  const queryClient = getQueryClient();
  await Promise.all([
    canReadSettings
      ? queryClient.prefetchQuery(footerSettingsOptions())
      : Promise.resolve(),
    canReadNavigation
      ? queryClient.prefetchQuery(menuSetListOptions())
      : Promise.resolve(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="사이트 화면 관리"
        description="공개 웹 푸터 표시 요소와 하단 메뉴를 관리합니다."
        tabs={<SiteLayoutNav />}
      />

      {!canReadSettings && !canReadNavigation ? (
        <QueryStateMessage
          title="사이트 화면 관리 권한이 없습니다."
          tone="destructive"
        />
      ) : (
        <HydrationBoundary state={dehydrate(queryClient)}>
          <div className="space-y-6">
            {canReadNavigation && (
              <PageToolbar
                right={<SlotMenuToolbarAction slot="FOOTER" />}
                mobileRightLabel="푸터 메뉴"
              />
            )}
            {canReadSettings && <FooterSettingsForm />}
          </div>
        </HydrationBoundary>
      )}
    </div>
  );
}
