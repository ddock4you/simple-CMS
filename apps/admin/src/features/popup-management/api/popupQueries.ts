import { queryOptions } from '@tanstack/react-query';

import { popupKeys } from '@/shared/api/queryKeys';

import {
  getHomePopups,
  getHomePopup,
  getHomePopupReferences,
} from './popupFetchers';

export const homePopupListOptions = () =>
  queryOptions({
    queryKey: popupKeys.lists(),
    queryFn: () => getHomePopups(),
  });

export const homePopupDetailOptions = (id: string) =>
  queryOptions({
    queryKey: popupKeys.detail(id),
    queryFn: () => getHomePopup(id),
  });

export const homePopupReferencesOptions = () =>
  queryOptions({
    queryKey: popupKeys.references(),
    queryFn: () => getHomePopupReferences(),
    staleTime: 5 * 60 * 1000,
  });
