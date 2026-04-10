import type { BoardSkinType } from '@simple-cms/db';

export type BoardVisibilityFilter = 'ALL' | 'PUBLIC' | 'PRIVATE';

export interface BoardListFilters {
  visibility: BoardVisibilityFilter;
  page: number;
  pageSize: number;
}

export const DEFAULT_BOARD_FILTERS: BoardListFilters = {
  visibility: 'ALL',
  page: 1,
  pageSize: 20,
};

export interface BoardListItem {
  id: string;
  name: string;
  slug: string;
  skinType: BoardSkinType;
  isPublic: boolean;
  displayOrder: number;
  postCount: number;
  updatedAt: string;
}

export interface BoardDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  skinType: BoardSkinType;
  isPublic: boolean;
  displayOrder: number;
  postCount: number;
  createdAt: string;
  updatedAt: string;
}
