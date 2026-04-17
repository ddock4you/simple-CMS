import { queryOptions } from '@tanstack/react-query';

import { fetchClient } from '@/shared/api/fetchClient';

import type { QuickSearchResult } from './quickSearchTypes';

interface QuickSearchResponse {
  results: QuickSearchResult[];
}

export const quickSearchKeys = {
  all: ['quick-search'] as const,
  query: (q: string) => [...quickSearchKeys.all, q] as const,
};

export function quickSearchOptions(q: string) {
  return queryOptions({
    queryKey: quickSearchKeys.query(q),
    queryFn: async () => {
      if (!q.trim()) return { results: [] } as QuickSearchResponse;
      const params = new URLSearchParams({ q });
      return fetchClient<QuickSearchResponse>(
        `/api/quick-search?${params.toString()}`,
      );
    },
    enabled: q.trim().length > 0,
    staleTime: 30_000,
  });
}
