'use client';

import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { FetchError } from '@/shared/api/fetchClient';
import { postKeys } from '@/shared/api/queryKeys';
import type { CreatePostData, UpdatePostData } from '../model/postSchemas';
import { createPost, updatePost, deletePost } from './postFetchers';

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
