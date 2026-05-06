import type { PaginatedResponse } from '@simple-cms/types';

import { fetchClient } from '@/shared/api/fetchClient';
import type {
  BoardListFilters,
  BoardListItem,
  BoardDetail,
} from '../model/boardFilters';
import type { CreateBoardData, UpdateBoardData } from '../model/boardSchemas';

export function getBoardList(
  filters: BoardListFilters,
): Promise<PaginatedResponse<BoardListItem>> {
  const params = new URLSearchParams();
  if (filters.visibility !== 'ALL') params.set('visibility', filters.visibility);
  params.set('page', String(filters.page));
  params.set('pageSize', String(filters.pageSize));
  if (filters.q) params.set('q', filters.q);

  return fetchClient<PaginatedResponse<BoardListItem>>(
    `/api/boards?${params.toString()}`,
  );
}

export function getBoardDetail(id: string): Promise<BoardDetail> {
  return fetchClient<BoardDetail>(`/api/boards/${id}`);
}

export function createBoard(data: CreateBoardData): Promise<{ id: string }> {
  return fetchClient<{ id: string }>('/api/boards', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateBoard(id: string, data: UpdateBoardData): Promise<null> {
  return fetchClient<null>(`/api/boards/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteBoard(id: string): Promise<null> {
  return fetchClient<null>(`/api/boards/${id}`, { method: 'DELETE' });
}

export function toggleBoardVisibility(
  id: string,
  isPublic: boolean,
): Promise<null> {
  return fetchClient<null>(`/api/boards/${id}/visibility`, {
    method: 'PATCH',
    body: JSON.stringify({ isPublic }),
  });
}
