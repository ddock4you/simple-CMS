import type { ContentStatus } from '@simple-cms/db';
import type { CclType } from '@simple-cms/types';

export type SubpageStatusFilter = ContentStatus | 'ALL';

export interface SubpageListFilters {
  status: SubpageStatusFilter;
  page: number;
  pageSize: number;
  q?: string;
}

export const DEFAULT_SUBPAGE_FILTERS: SubpageListFilters = {
  status: 'ALL',
  page: 1,
  pageSize: 20,
  q: undefined,
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
  cclType: CclType | null;
  cclAi: boolean;
  feedbackEnabled: boolean;
  displayOrder: number;
  revision: number;
  createdAt: string;
  updatedAt: string;
}
