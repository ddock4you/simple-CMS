import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { requireAuth } from '@/entities/auth/lib/getCurrentUser';
import { footerSettingsOptions } from '@/features/site-settings/api/settingsQueries';
import { FooterSettingsForm } from '@/features/site-settings/ui/FooterSettingsForm';
import { SettingsNav } from '@/features/site-settings/ui/SettingsNav';
import { getQueryClient } from '@/shared/api/queryClient';
import { PageHeader } from '@/shared/ui/PageHeader';

export default async function FooterSettingsPage() {
  await requireAuth();

  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(footerSettingsOptions());

  return (
    <div className="space-y-6">
      <PageHeader
        title="사이트 설정"
        description="사이트 전역 설정을 관리합니다."
        tabs={<SettingsNav />}
      />
      <div>
        <h2 className="text-lg font-semibold">푸터 설정</h2>
        <p className="text-sm text-muted-foreground mb-4">
          공개 웹 하단 KRDS Footer에 표시할 기관 정보, 관련 사이트, 정책 링크를
          관리합니다. 일반 푸터 메뉴는 메뉴 관리의 FOOTER 슬롯에서 관리합니다.
        </p>
        <HydrationBoundary state={dehydrate(queryClient)}>
          <FooterSettingsForm />
        </HydrationBoundary>
      </div>
    </div>
  );
}
