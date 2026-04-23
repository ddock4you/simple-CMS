import { queryOptions } from '@tanstack/react-query';

import type { HomePopupReferencesDto } from '@simple-cms/types';

import { fetchClient } from '@/shared/api/fetchClient';
import { linkTargetKeys } from '@/shared/api/queryKeys';

export type LinkTargetReferencesDto = HomePopupReferencesDto;

export function getLinkTargetReferences(): Promise<LinkTargetReferencesDto> {
  return fetchClient<LinkTargetReferencesDto>('/api/home-popups/references');
}

export const linkTargetReferencesOptions = () =>
  queryOptions({
    queryKey: linkTargetKeys.references(),
    queryFn: () => getLinkTargetReferences(),
    staleTime: 5 * 60 * 1000,
  });
