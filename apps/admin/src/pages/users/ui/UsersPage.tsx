import { Suspense } from 'react';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { requireAuth } from '@/entities/auth/lib/getCurrentUser';
import { getQueryClient } from '@/shared/api/queryClient';
import { PageHeader } from '@/shared/ui/PageHeader';
import { PageToolbar } from '@/shared/ui/PageToolbar';
import { ListSearchInput } from '@/shared/ui/ListSearchInput';
import {
  userListOptions,
  roleListOptions,
} from '@/features/user-management/api/userQueries';
import type {
  UserListFilters,
  UserStatusFilter,
} from '@/features/user-management/model/userFilters';
import { UserStatusFilter as StatusFilter } from '@/features/user-management/ui/UserStatusFilter';
import { UserTable } from '@/features/user-management/ui/UserTable';

function parseFilters(
  searchParams: Record<string, string | string[] | undefined>,
): UserListFilters {
  const status = (searchParams.status as UserStatusFilter) || 'ALL';
  const page = Number(searchParams.page) || 1;
  const pageSize = Number(searchParams.pageSize) || 20;
  const q =
    typeof searchParams.q === 'string' && searchParams.q.trim()
      ? searchParams.q.trim()
      : undefined;

  return { status, page, pageSize, q };
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAuth();
  const params = await searchParams;
  const filters = parseFilters(params);

  const queryClient = getQueryClient();
  await Promise.all([
    queryClient.prefetchQuery(userListOptions(filters)),
    queryClient.prefetchQuery(roleListOptions()),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="사용자 관리" description="사용자 목록 및 상태를 관리합니다." />
      <PageToolbar
        left={
          <div className="flex items-center gap-2">
            <Suspense>
              <StatusFilter currentStatus={filters.status} />
            </Suspense>
            <Suspense>
              <ListSearchInput
                placeholder="사용자명·이름으로 검색"
                defaultValue={filters.q ?? ''}
              />
            </Suspense>
          </div>
        }
        mobileLeftLabel="상태 · 검색"
      />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <UserTable
          filters={filters}
          currentUserId={user.id}
          isCurrentUserSystemAdmin={user.role?.isSystem ?? false}
        />
      </HydrationBoundary>
    </div>
  );
}
