import { cache } from 'react';

import { searchContent } from '@simple-cms/db';
import type { SearchContentType, SearchResponse } from '@simple-cms/db';

export const getSearchResults = cache(
  async (
    query: string,
    page = 1,
    type: SearchContentType = 'all',
  ): Promise<SearchResponse> => {
    return searchContent(query, page, undefined, type);
  },
);
