import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { requireAuth } from '@/entities/auth/lib/getCurrentUser';
import { hasPermission } from '@/entities/auth/lib/checkPermission';
import { getQueryClient } from '@/shared/api/queryClient';
import {
  homeReferencesOptions,
  homeSectionListOptions,
} from '@/features/home-management/api/homeQueries';

import { HomePageClient } from './HomePageClient';

export default async function HomePage() {
  const user = await requireAuth();
  const canUpdate = hasPermission(user, 'home', 'update');

  const queryClient = getQueryClient();
  await Promise.all([
    queryClient.prefetchQuery(homeSectionListOptions()),
    queryClient.prefetchQuery(homeReferencesOptions()),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">메인 페이지</h1>
        <p className="text-muted-foreground">
          공개 웹 메인 페이지에 표시되는 섹션을 관리합니다. 드래그로 순서를
          변경하고, 편집 버튼으로 내용을 수정하세요.
        </p>
      </div>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <HomePageClient canUpdate={canUpdate} />
      </HydrationBoundary>
    </div>
  );
}
