import { queryOptions } from '@tanstack/react-query';

import type { MediaListFilters } from '@simple-cms/types';

import { mediaKeys } from '@/shared/api/queryKeys';

import {
  getMediaDetail,
  getMediaList,
  getMediaReferences,
} from './mediaFetchers';

export const mediaListOptions = (filters: MediaListFilters) =>
  queryOptions({
    queryKey: mediaKeys.list(filters),
    queryFn: () => getMediaList(filters),
  });

export const mediaDetailOptions = (id: string | null) =>
  queryOptions({
    queryKey: mediaKeys.detail(id ?? ''),
    queryFn: () => getMediaDetail(id as string),
    enabled: !!id,
  });

export const mediaReferencesOptions = (id: string | null) =>
  queryOptions({
    queryKey: mediaKeys.references(id ?? ''),
    queryFn: () => getMediaReferences(id as string),
    enabled: !!id,
  });
