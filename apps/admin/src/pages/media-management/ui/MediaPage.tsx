import { Suspense } from 'react';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { requireAuth } from '@/entities/auth/lib/getCurrentUser';
import { hasPermission } from '@/entities/auth/lib/checkPermission';
import { getQueryClient } from '@/shared/api/queryClient';
import { mediaListOptions } from '@/features/media-management/api/mediaQueries';
import { parseMediaFilters } from '@/features/media-management/model/mediaFilters';
import { MediaPageClient } from './MediaPageClient';

export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAuth();
  const canCreate = hasPermission(user, 'media', 'create');
  const params = await searchParams;
  const filters = parseMediaFilters(params);

  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(mediaListOptions(filters));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">미디어 라이브러리</h1>
        <p className="text-muted-foreground">
          업로드한 이미지를 관리합니다. 동일 파일은 자동으로 재사용되어 중복
          저장되지 않습니다.
        </p>
      </div>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Suspense>
          <MediaPageClient filters={filters} canCreate={canCreate} />
        </Suspense>
      </HydrationBoundary>
    </div>
  );
}
