import { cache } from 'react';

import { searchContent } from '@simple-cms/db';
import type { SearchResponse } from '@simple-cms/db';

export const getSearchResults = cache(
  async (query: string, page = 1): Promise<SearchResponse> => {
    return searchContent(query, page);
  },
);
