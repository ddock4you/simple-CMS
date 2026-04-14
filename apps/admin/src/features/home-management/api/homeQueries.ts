import { queryOptions } from '@tanstack/react-query';

import { homeKeys } from '@/shared/api/queryKeys';
import {
  getHomeSections,
  getHomeSection,
  getHomeReferences,
} from './homeFetchers';

export const homeSectionListOptions = () =>
  queryOptions({
    queryKey: homeKeys.lists(),
    queryFn: () => getHomeSections(),
  });

export const homeSectionDetailOptions = (id: string) =>
  queryOptions({
    queryKey: homeKeys.detail(id),
    queryFn: () => getHomeSection(id),
  });

export const homeReferencesOptions = () =>
  queryOptions({
    queryKey: homeKeys.references(),
    queryFn: () => getHomeReferences(),
    staleTime: 5 * 60 * 1000,
  });
