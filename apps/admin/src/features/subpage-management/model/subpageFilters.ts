import type { ContentStatus } from '@simple-cms/db';

export type SubpageStatusFilter = ContentStatus | 'ALL';

export interface SubpageListFilters {
  status: SubpageStatusFilter;
  page: number;
  pageSize: number;
}

export const DEFAULT_SUBPAGE_FILTERS: SubpageListFilters = {
  status: 'ALL',
  page: 1,
  pageSize: 20,
};

export interface SubpageListItem {
  id: string;
  title: string;
  slug: string;
  status: ContentStatus;
  publishedAt: string | null;
  displayOrder: number;
  updatedAt: string;
}

export interface SubpageDetail {
  id: string;
  title: string;
  slug: string;
  seoTitle: string | null;
  seoDescription: string | null;
  status: ContentStatus;
  publishedAt: string | null;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}
