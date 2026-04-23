import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { requireAuth } from '@/entities/auth/lib/getCurrentUser';
import { getQueryClient } from '@/shared/api/queryClient';
import { brandingSettingsOptions } from '@/features/site-settings/api/settingsQueries';
import { BrandingSettingsForm } from '@/features/site-settings/ui/BrandingSettingsForm';
import { SettingsNav } from '@/features/site-settings/ui/SettingsNav';

export default async function BrandingSettingsPage() {
  await requireAuth();

  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(brandingSettingsOptions());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">사이트 설정</h1>
        <p className="text-muted-foreground">사이트 전역 설정을 관리합니다.</p>
      </div>
      <SettingsNav />
      <div>
        <h2 className="text-lg font-semibold">브랜딩 + SEO 메타데이터</h2>
        <p className="text-sm text-muted-foreground mb-4">
          공개 웹 헤더의 로고와 사이트명, 파비콘, OG 이미지, SEO 설명을 한
          곳에서 관리합니다. 외부 URL 직접 입력은 보안상 차단되며 업로드 또는
          미디어 라이브러리에서 선택해주세요.
        </p>
        <HydrationBoundary state={dehydrate(queryClient)}>
          <BrandingSettingsForm />
        </HydrationBoundary>
      </div>
    </div>
  );
}
