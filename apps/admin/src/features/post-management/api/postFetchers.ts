import type { PaginatedResponse } from '@simple-cms/types';
import type { ContentStatus } from '@simple-cms/db';

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
  if (filters.q) params.set('q', filters.q);

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

export function togglePostStatus(
  id: string,
  status: ContentStatus,
): Promise<null> {
  return fetchClient<null>(`/api/posts/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export interface BulkDeletePostResponse {
  deleted: string[];
  blocked: Array<{ id: string; title: string; reason: string }>;
}

export interface BulkStatusPostResponse {
  updated: string[];
  failed: Array<{ id: string; reason: string }>;
}

export interface BulkMovePostResponse {
  updated: string[];
  failed: Array<{ id: string; title: string; reason: string }>;
}

export function bulkDeletePosts(ids: string[]): Promise<BulkDeletePostResponse> {
  return fetchClient<BulkDeletePostResponse>('/api/posts/bulk-delete', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
}

export function bulkUpdatePostStatus(
  ids: string[],
  status: ContentStatus,
): Promise<BulkStatusPostResponse> {
  return fetchClient<BulkStatusPostResponse>('/api/posts/bulk-status', {
    method: 'POST',
    body: JSON.stringify({ ids, status }),
  });
}

export function bulkMovePosts(
  ids: string[],
  boardId: string,
): Promise<BulkMovePostResponse> {
  return fetchClient<BulkMovePostResponse>('/api/posts/bulk-move', {
    method: 'POST',
    body: JSON.stringify({ ids, boardId }),
  });
}
