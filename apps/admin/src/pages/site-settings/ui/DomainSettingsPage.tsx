import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { requireAuth } from '@/entities/auth/lib/getCurrentUser';
import { getQueryClient } from '@/shared/api/queryClient';
import { domainSettingsOptions } from '@/features/site-settings/api/settingsQueries';
import { SettingsNav } from '@/features/site-settings/ui/SettingsNav';
import { DomainSettingsForm } from '@/features/site-settings/ui/DomainSettingsForm';

export default async function DomainSettingsPage() {
  await requireAuth();

  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(domainSettingsOptions());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">사이트 설정</h1>
        <p className="text-muted-foreground">사이트 전역 설정을 관리합니다.</p>
      </div>
      <SettingsNav />
      <div>
        <h2 className="text-lg font-semibold">도메인 설정</h2>
        <p className="text-sm text-muted-foreground mb-4">
          공개 웹 사이트에 사용할 커스텀 도메인을 설정합니다. 도메인 등록 후 DNS 레코드를 확인하여 연결 상태를 검증할 수 있습니다.
        </p>
        <HydrationBoundary state={dehydrate(queryClient)}>
          <DomainSettingsForm />
        </HydrationBoundary>
      </div>
    </div>
  );
}
