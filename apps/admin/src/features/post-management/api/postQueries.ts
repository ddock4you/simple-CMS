import { queryOptions } from '@tanstack/react-query';

import { postKeys, boardKeys } from '@/shared/api/queryKeys';
import type { PostListFilters } from '../model/postFilters';
import { getPostList, getPostDetail, getBoardOptions } from './postFetchers';

export const postListOptions = (filters: PostListFilters) =>
  queryOptions({
    queryKey: postKeys.list(filters),
    queryFn: () => getPostList(filters),
  });

export const postDetailOptions = (id: string) =>
  queryOptions({
    queryKey: postKeys.detail(id),
    queryFn: () => getPostDetail(id),
  });

export const boardOptionsQuery = () =>
  queryOptions({
    queryKey: boardKeys.options(),
    queryFn: () => getBoardOptions(),
    staleTime: 5 * 60 * 1000,
  });
