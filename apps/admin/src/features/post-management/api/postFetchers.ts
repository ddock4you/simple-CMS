import type { PaginatedResponse } from '@simple-cms/types';

import { fetchClient } from '@/shared/api/fetchClient';
import type {
  PostListFilters,
  PostListItem,
  PostDetail,
  BoardOption,
} from '../model/postFilters';
import type { CreatePostData, UpdatePostData } from '../model/postSchemas';

export function getPostList(
  filters: PostListFilters,
): Promise<PaginatedResponse<PostListItem>> {
  const params = new URLSearchParams();
  if (filters.status !== 'ALL') params.set('status', filters.status);
  if (filters.boardId) params.set('boardId', filters.boardId);
  params.set('page', String(filters.page));
  params.set('pageSize', String(filters.pageSize));

  return fetchClient<PaginatedResponse<PostListItem>>(
    `/api/posts?${params.toString()}`,
  );
}

export function getPostDetail(id: string): Promise<PostDetail> {
  return fetchClient<PostDetail>(`/api/posts/${id}`);
}

export function createPost(data: CreatePostData): Promise<{ id: string }> {
  return fetchClient<{ id: string }>('/api/posts', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updatePost(id: string, data: UpdatePostData): Promise<null> {
  return fetchClient<null>(`/api/posts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deletePost(id: string): Promise<null> {
  return fetchClient<null>(`/api/posts/${id}`, { method: 'DELETE' });
}

export async function getBoardOptions(): Promise<BoardOption[]> {
  const data = await fetchClient<PaginatedResponse<{ id: string; name: string }>>(
    '/api/boards?pageSize=100',
  );
  return data.items.map((b) => ({ id: b.id, name: b.name }));
}
