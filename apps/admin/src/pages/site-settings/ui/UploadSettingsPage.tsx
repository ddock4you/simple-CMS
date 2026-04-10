import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { requireAuth } from '@/entities/auth/lib/getCurrentUser';
import { getQueryClient } from '@/shared/api/queryClient';
import { uploadSettingsOptions } from '@/features/site-settings/api/settingsQueries';
import { SettingsNav } from '@/features/site-settings/ui/SettingsNav';
import { UploadSettingsForm } from '@/features/site-settings/ui/UploadSettingsForm';

export default async function UploadSettingsPage() {
  await requireAuth();

  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(uploadSettingsOptions());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">사이트 설정</h1>
        <p className="text-muted-foreground">사이트 전역 설정을 관리합니다.</p>
      </div>
      <SettingsNav />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <UploadSettingsForm />
      </HydrationBoundary>
    </div>
  );
}
