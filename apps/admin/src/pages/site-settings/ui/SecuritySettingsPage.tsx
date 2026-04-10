import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { requireAuth } from '@/entities/auth/lib/getCurrentUser';
import { getQueryClient } from '@/shared/api/queryClient';
import { securitySettingsOptions } from '@/features/site-settings/api/settingsQueries';
import { SettingsNav } from '@/features/site-settings/ui/SettingsNav';
import { SecuritySettingsForm } from '@/features/site-settings/ui/SecuritySettingsForm';

export default async function SecuritySettingsPage() {
  await requireAuth();

  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(securitySettingsOptions());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">사이트 설정</h1>
        <p className="text-muted-foreground">사이트 전역 설정을 관리합니다.</p>
      </div>
      <SettingsNav />
      <div>
        <h2 className="text-lg font-semibold">보안 설정</h2>
        <p className="text-sm text-muted-foreground mb-4">
          관리자 계정의 보안 정책을 설정합니다. 동시 로그인을 차단하면 새 로그인 시 기존 세션이 자동으로 종료됩니다.
        </p>
        <HydrationBoundary state={dehydrate(queryClient)}>
          <SecuritySettingsForm />
        </HydrationBoundary>
      </div>
    </div>
  );
}
