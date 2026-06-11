import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { requireAuth } from '@/entities/auth/lib/getCurrentUser';
import { hasPermission } from '@/entities/auth/lib/checkPermission';
import { getQueryClient } from '@/shared/api/queryClient';
import { PageHeader } from '@/shared/ui/PageHeader';
import { menuSetListOptions } from '@/features/navigation-management/api/navigationQueries';
import { NavigationListClient } from './NavigationListClient';

interface NavigationListPageProps {
  editBasePath?: string;
  createRedirectBasePath?: string;
  deleteRedirectPath?: string;
}

export default async function NavigationListPage({
  editBasePath,
  createRedirectBasePath,
  deleteRedirectPath,
}: NavigationListPageProps = {}) {
  const user = await requireAuth();
  const canCreate = hasPermission(user, 'navigation', 'create');

  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(menuSetListOptions());

  return (
    <div className="space-y-6">
      <PageHeader title="메뉴 관리" description="사이트 네비게이션 메뉴를 관리합니다." />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <NavigationListClient
          canCreate={canCreate}
          editBasePath={editBasePath}
          createRedirectBasePath={createRedirectBasePath}
          deleteRedirectPath={deleteRedirectPath}
        />
      </HydrationBoundary>
    </div>
  );
}
