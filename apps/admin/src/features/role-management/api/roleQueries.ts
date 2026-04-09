import { queryOptions } from '@tanstack/react-query';

import { roleKeys } from '@/shared/api/queryKeys';

import {
  getRoleListFull,
  getRoleDetail,
} from '@/features/role-management/api/roleFetchers';

export { roleKeys };

export const roleListFullOptions = () =>
  queryOptions({
    queryKey: roleKeys.list(),
    queryFn: () => getRoleListFull(),
  });

export const roleDetailOptions = (id: string) =>
  queryOptions({
    queryKey: roleKeys.detail(id),
    queryFn: () => getRoleDetail(id),
    enabled: !!id,
  });
