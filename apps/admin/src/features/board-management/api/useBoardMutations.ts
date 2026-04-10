'use client';

import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { FetchError } from '@/shared/api/fetchClient';
import { boardKeys } from '@/shared/api/queryKeys';
import type { CreateBoardData, UpdateBoardData } from '../model/boardSchemas';
import { createBoard, updateBoard, deleteBoard } from './boardFetchers';

export function useCreateBoard() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBoardData) => createBoard(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: boardKeys.lists() });
      toast.success('게시판이 생성되었습니다.');
      router.push(`/boards/${result.id}`);
    },
    onError: (error: FetchError) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateBoard(id: string) {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateBoardData) => updateBoard(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.lists() });
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(id) });
      toast.success('게시판이 수정되었습니다.');
      router.push(`/boards/${id}`);
    },
    onError: (error: FetchError) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteBoard() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteBoard(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.lists() });
      toast.success('게시판이 삭제되었습니다.');
      router.push('/boards');
    },
    onError: (error: FetchError) => {
      toast.error(error.message);
    },
  });
}
