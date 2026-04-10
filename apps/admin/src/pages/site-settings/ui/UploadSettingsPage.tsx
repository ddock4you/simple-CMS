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
      <div>
        <h2 className="text-lg font-semibold">업로드 제한 설정</h2>
        <p className="text-sm text-muted-foreground mb-4">
          파일 업로드 시 허용되는 확장자, MIME 타입, 최대 파일 크기를 설정합니다. 서버에서 업로드 요청을 검증할 때 이 설정이 적용됩니다.
        </p>
        <HydrationBoundary state={dehydrate(queryClient)}>
          <UploadSettingsForm />
        </HydrationBoundary>
      </div>
    </div>
  );
}
