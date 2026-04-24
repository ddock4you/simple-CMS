import type { ContentStatus } from '@simple-cms/db';

export type PostStatusFilter = ContentStatus | 'ALL';

export interface PostListFilters {
  status: PostStatusFilter;
  boardId: string | null;
  page: number;
  pageSize: number;
}

export const DEFAULT_POST_FILTERS: PostListFilters = {
  status: 'ALL',
  boardId: null,
  page: 1,
  pageSize: 20,
};

export interface PostListItem {
  id: string;
  title: string;
  slug: string;
  boardId: string;
  boardName: string;
  status: ContentStatus;
  authorName: string | null;
  publishedAt: string | null;
  updatedAt: string;
}

export interface PostDetail {
  id: string;
  title: string;
  slug: string;
  boardId: string;
  boardName: string;
  boardSlug: string;
  seoTitle: string | null;
  seoDescription: string | null;
  contentJson: unknown;
  status: ContentStatus;
  authorId: string | null;
  authorName: string | null;
  publishedAt: string | null;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface BoardOption {
  id: string;
  name: string;
}
