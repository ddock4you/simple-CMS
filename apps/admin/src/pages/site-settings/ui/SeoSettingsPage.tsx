import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { requireAuth } from '@/entities/auth/lib/getCurrentUser';
import { getQueryClient } from '@/shared/api/queryClient';
import { seoSettingsOptions } from '@/features/site-settings/api/settingsQueries';
import { PageHeader } from '@/shared/ui/PageHeader';
import { SettingsNav } from '@/features/site-settings/ui/SettingsNav';
import { SeoSettingsForm } from '@/features/site-settings/ui/SeoSettingsForm';

export default async function SeoSettingsPage() {
  await requireAuth();

  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(seoSettingsOptions());

  return (
    <div className="space-y-6">
      <PageHeader
        title="사이트 설정"
        description="사이트 전역 설정을 관리합니다."
        tabs={<SettingsNav />}
      />
      <div>
        <h2 className="text-lg font-semibold">SEO 설정</h2>
        <p className="text-sm text-muted-foreground mb-4">
          검색엔진 크롤링 규칙(robots.txt)과 사이트맵 URL을 관리합니다.
          페이지별 SEO 메타데이터(제목·설명·OG 이미지)는 서브페이지 편집 화면에서
          설정합니다.
        </p>
        <HydrationBoundary state={dehydrate(queryClient)}>
          <SeoSettingsForm />
        </HydrationBoundary>
      </div>
    </div>
  );
}
