import { Suspense } from 'react';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { requireAuth } from '@/entities/auth/lib/getCurrentUser';
import { getQueryClient } from '@/shared/api/queryClient';
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

  return { status, page, pageSize };
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
      <div>
        <h1 className="text-2xl font-bold">사용자 관리</h1>
        <p className="text-muted-foreground">
          사용자 목록 및 상태를 관리합니다.
        </p>
      </div>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Suspense>
          <StatusFilter currentStatus={filters.status} />
        </Suspense>
        <UserTable
          filters={filters}
          currentUserId={user.id}
          isCurrentUserSystemAdmin={user.role?.isSystem ?? false}
        />
      </HydrationBoundary>
    </div>
  );
}
