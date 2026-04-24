import { queryOptions } from '@tanstack/react-query';

import { subpageVersionKeys } from '@/shared/api/queryKeys';

import type { SubpageVersionListFilters } from '../model/versionFilters';
import {
  getSubpageVersionDetail,
  getSubpageVersionList,
} from './versionFetchers';

export const subpageVersionListOptions = (
  subpageId: string,
  filters: SubpageVersionListFilters,
) =>
  queryOptions({
    queryKey: subpageVersionKeys.list(subpageId, filters),
    queryFn: () => getSubpageVersionList(subpageId, filters),
  });

export const subpageVersionDetailOptions = (
  subpageId: string,
  versionId: string,
) =>
  queryOptions({
    queryKey: subpageVersionKeys.detail(subpageId, versionId),
    queryFn: () => getSubpageVersionDetail(subpageId, versionId),
  });

/**
 * SubpageView 우측 카드에서 최근 5개만 요약 조회.
 * 일반 목록과 캐시 키를 분리하여 필터 UI와 별도 lifecycle을 가진다.
 */
export const recentSubpageVersionsOptions = (subpageId: string) =>
  queryOptions({
    queryKey: subpageVersionKeys.recent(subpageId),
    queryFn: () =>
      getSubpageVersionList(subpageId, {
        authorId: null,
        from: null,
        to: null,
        pinnedOnly: false,
        source: null,
        page: 1,
        pageSize: 5,
      }),
  });
