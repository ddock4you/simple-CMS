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
      <HydrationBoundary state={dehydrate(queryClient)}>
        <SecuritySettingsForm />
      </HydrationBoundary>
    </div>
  );
}
