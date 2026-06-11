import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { hasPermission } from '@/entities/auth/lib/checkPermission';
import { requireAuth } from '@/entities/auth/lib/getCurrentUser';
import { brandingSettingsOptions } from '@/features/site-settings/api/settingsQueries';
import { HeaderLogoSettingsForm } from '@/features/site-layout/ui/HeaderLogoSettingsForm';
import { SiteLayoutNav } from '@/features/site-layout/ui/SiteLayoutNav';
import { SlotMenuSection } from '@/features/site-layout/ui/SlotMenuSection';
import { menuSetListOptions } from '@/features/navigation-management/api/navigationQueries';
import { getQueryClient } from '@/shared/api/queryClient';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryStateMessage } from '@/shared/ui/QueryStateMessage';

export default async function SiteLayoutHeaderPage() {
  const user = await requireAuth();
  const canReadSettings = hasPermission(user, 'settings', 'read');
  const canReadNavigation = hasPermission(user, 'navigation', 'read');

  const queryClient = getQueryClient();
  await Promise.all([
    canReadSettings
      ? queryClient.prefetchQuery(brandingSettingsOptions())
      : Promise.resolve(),
    canReadNavigation
      ? queryClient.prefetchQuery(menuSetListOptions())
      : Promise.resolve(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="사이트 화면 관리"
        description="공개 웹 헤더, 메뉴, 푸터 구성을 관리합니다."
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
            {canReadSettings && <HeaderLogoSettingsForm />}
            {canReadNavigation && (
              <SlotMenuSection
                slot="HEADER"
                title="헤더 메뉴"
                description="공개 웹 상단 GNB에 배치되는 HEADER 슬롯 메뉴입니다."
              />
            )}
          </div>
        </HydrationBoundary>
      )}
    </div>
  );
}
