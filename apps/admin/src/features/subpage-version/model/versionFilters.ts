import type { SubpageVersionSource } from '@simple-cms/types';

export interface SubpageVersionListFilters {
  authorId: string | null;
  from: string | null;
  to: string | null;
  pinnedOnly: boolean;
  source: SubpageVersionSource | null;
  page: number;
  pageSize: number;
}

export const DEFAULT_SUBPAGE_VERSION_FILTERS: SubpageVersionListFilters = {
  authorId: null,
  from: null,
  to: null,
  pinnedOnly: false,
  source: null,
  page: 1,
  pageSize: 20,
};
