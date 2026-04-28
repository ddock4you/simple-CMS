import { queryOptions } from '@tanstack/react-query';

import { navigationKeys, subpageKeys, boardKeys } from '@/shared/api/queryKeys';
import {
  getMenuSetList,
  getMenuSetDetail,
  getSubpageOptions,
  getBoardOptions,
} from './navigationFetchers';

export const menuSetListOptions = () =>
  queryOptions({
    queryKey: navigationKeys.lists(),
    queryFn: () => getMenuSetList(),
  });

export const menuSetDetailOptions = (menuId: string) =>
  queryOptions({
    queryKey: navigationKeys.detail(menuId),
    queryFn: () => getMenuSetDetail(menuId),
  });

export const subpageOptionsQuery = () =>
  queryOptions({
    queryKey: subpageKeys.options(),
    queryFn: () => getSubpageOptions(),
    staleTime: 5 * 60 * 1000,
  });

export const boardOptionsForNavQuery = () =>
  queryOptions({
    queryKey: boardKeys.options(),
    queryFn: () => getBoardOptions(),
    staleTime: 5 * 60 * 1000,
  });
