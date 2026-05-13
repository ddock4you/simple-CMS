'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { QueryKey, UseMutationResult } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { ContentStatus } from '@simple-cms/db';
import type { ListSnapshot } from '@simple-cms/types';

import type { FetchError } from '@/shared/api/fetchClient';
import { postKeys } from '@/shared/api/queryKeys';
import { createCrudMutations } from '@/shared/api/crudMutations';
import { createToggleMutation } from '@/shared/api/toggleMutation';
import { createBulkDeleteMutation } from '@/shared/api/bulkDeleteMutation';
import { createBulkStatusMutation } from '@/shared/api/bulkStatusMutation';
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

const {
  useCreate: useCreatePost,
  useUpdate: useUpdatePost,
  useDelete: useDeletePost,
} = createCrudMutations<CreatePostData, UpdatePostData, { id: string }>({
  keys: postKeys,
  endpoints: {
    create: createPost,
    update: updatePost,
    delete: deletePost,
  },
  messages: {
    create: '게시글이 생성되었습니다.',
    update: '게시글이 수정되었습니다.',
    delete: '게시글이 삭제되었습니다.',
  },
  routerPaths: {
    afterCreate: (result) => `/posts/${result.id}`,
    afterUpdate: (id) => `/posts/${id}`,
    afterDelete: '/posts',
  },
});

const _useTogglePostStatus = createToggleMutation<PostListItem, 'status', ContentStatus>({
  keys: postKeys,
  field: 'status',
  mutationFn: togglePostStatus,
  successMessage: (status) =>
    status === 'PUBLISHED' ? '발행되었습니다.' : '초안으로 변경되었습니다.',
});

export function useTogglePostStatus(): UseMutationResult<
  unknown,
  FetchError,
  { id: string; status: ContentStatus },
  { previousLists: [QueryKey, ListSnapshot<PostListItem> | undefined][] }
> {
  return _useTogglePostStatus();
}

const useBulkDeletePosts = createBulkDeleteMutation<BulkDeletePostResponse>({
  keys: postKeys,
  mutationFn: bulkDeletePosts,
  messages: {
    allSuccess: (count) => `${count}개 게시글이 삭제되었습니다.`,
    partial: (deleted, blocked) => `${deleted}개 삭제, ${blocked}개 실패`,
    allBlocked: (count) => `선택한 ${count}개 모두 삭제 실패`,
  },
});

const useBulkUpdatePostStatus = createBulkStatusMutation<BulkStatusPostResponse>({
  keys: postKeys,
  mutationFn: bulkUpdatePostStatus,
});

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

export {
  useCreatePost,
  useUpdatePost,
  useDeletePost,
  useBulkDeletePosts,
  useBulkUpdatePostStatus,
};
