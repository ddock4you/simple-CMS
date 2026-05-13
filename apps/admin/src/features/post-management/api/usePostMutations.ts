'use client';

import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { ContentStatus } from '@simple-cms/db';
import type { ListSnapshot } from '@simple-cms/types';

import type { FetchError } from '@/shared/api/fetchClient';
import { postKeys } from '@/shared/api/queryKeys';
import type { CreatePostData, UpdatePostData } from '../model/postSchemas';
import type { PostListItem } from '../model/postFilters';
import {
  createPost,
  updatePost,
  deletePost,
  togglePostStatus,
  bulkDeletePosts,
  bulkUpdatePostStatus,
  bulkMovePosts,
  type BulkDeletePostResponse,
  type BulkStatusPostResponse,
  type BulkMovePostResponse,
} from './postFetchers';

export function useCreatePost() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePostData) => createPost(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
      toast.success('게시글이 생성되었습니다.');
      router.push(`/posts/${result.id}`);
    },
    onError: (error: FetchError) => {
      toast.error(error.message);
    },
  });
}

export function useUpdatePost(id: string) {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdatePostData) => updatePost(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
      queryClient.invalidateQueries({ queryKey: postKeys.detail(id) });
      toast.success('게시글이 수정되었습니다.');
      router.push(`/posts/${id}`);
    },
    onError: (error: FetchError) => {
      toast.error(error.message);
    },
  });
}

export function useDeletePost() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deletePost(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
      toast.success('게시글이 삭제되었습니다.');
      router.push('/posts');
    },
    onError: (error: FetchError) => {
      toast.error(error.message);
    },
  });
}

export function useTogglePostStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ContentStatus }) =>
      togglePostStatus(id, status),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: postKeys.lists() });
      const previousLists = queryClient.getQueriesData<ListSnapshot<PostListItem>>({
        queryKey: postKeys.lists(),
      });
      queryClient.setQueriesData<ListSnapshot<PostListItem>>(
        { queryKey: postKeys.lists() },
        (old) =>
          old
            ? {
                ...old,
                items: old.items.map((item) =>
                  item.id === id ? { ...item, status } : item,
                ),
              }
            : old,
      );
      return { previousLists };
    },
    onError: (error: FetchError, _vars, context) => {
      if (context?.previousLists) {
        for (const [queryKey, data] of context.previousLists) {
          queryClient.setQueryData(queryKey, data);
        }
      }
      toast.error(error.message);
    },
    onSuccess: (_data, { status }) => {
      toast.success(
        status === 'PUBLISHED' ? '발행되었습니다.' : '초안으로 변경되었습니다.',
      );
    },
    onSettled: (_data, _error, { id }) => {
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
      queryClient.invalidateQueries({ queryKey: postKeys.detail(id) });
    },
  });
}

export function useBulkDeletePosts(options?: {
  onSuccess?: (data: BulkDeletePostResponse) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => bulkDeletePosts(ids),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
      if (data.deleted.length > 0 && data.blocked.length === 0) {
        toast.success(`${data.deleted.length}개 게시글이 삭제되었습니다.`);
      } else if (data.deleted.length > 0 && data.blocked.length > 0) {
        toast.warning(
          `${data.deleted.length}개 삭제, ${data.blocked.length}개 실패`,
        );
      } else if (data.blocked.length > 0) {
        toast.error(`선택한 ${data.blocked.length}개 모두 삭제 실패`);
      }
      options?.onSuccess?.(data);
    },
    onError: (error: FetchError) => {
      toast.error(error.message);
    },
  });
}

export function useBulkUpdatePostStatus(options?: {
  onSuccess?: (data: BulkStatusPostResponse) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: ContentStatus }) =>
      bulkUpdatePostStatus(ids, status),
    onSuccess: (data, { status }) => {
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
      const label = status === 'PUBLISHED' ? '발행' : '초안';
      if (data.updated.length > 0 && data.failed.length === 0) {
        toast.success(`${data.updated.length}개 ${label} 처리되었습니다.`);
      } else if (data.failed.length > 0) {
        toast.warning(
          `${data.updated.length}개 처리, ${data.failed.length}개 실패`,
        );
      }
      options?.onSuccess?.(data);
    },
    onError: (error: FetchError) => {
      toast.error(error.message);
    },
  });
}

export function useBulkMovePosts(options?: {
  onSuccess?: (data: BulkMovePostResponse) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ids, boardId }: { ids: string[]; boardId: string }) =>
      bulkMovePosts(ids, boardId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
      if (data.updated.length > 0 && data.failed.length === 0) {
        toast.success(`${data.updated.length}개 이동되었습니다.`);
      } else if (data.failed.length > 0) {
        toast.warning(
          `${data.updated.length}개 이동, ${data.failed.length}개 실패 (slug 충돌 가능성)`,
        );
      }
      options?.onSuccess?.(data);
    },
    onError: (error: FetchError) => {
      toast.error(error.message);
    },
  });
}
