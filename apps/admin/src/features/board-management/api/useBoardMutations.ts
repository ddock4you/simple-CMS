'use client';

import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { ListSnapshot } from '@simple-cms/types';

import type { FetchError } from '@/shared/api/fetchClient';
import { boardKeys } from '@/shared/api/queryKeys';
import type { CreateBoardData, UpdateBoardData } from '../model/boardSchemas';
import type { BoardListItem } from '../model/boardFilters';
import {
  createBoard,
  updateBoard,
  deleteBoard,
  toggleBoardVisibility,
} from './boardFetchers';

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

export function useToggleBoardVisibility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isPublic }: { id: string; isPublic: boolean }) =>
      toggleBoardVisibility(id, isPublic),
    onMutate: async ({ id, isPublic }) => {
      await queryClient.cancelQueries({ queryKey: boardKeys.lists() });
      const previousLists = queryClient.getQueriesData<ListSnapshot<BoardListItem>>({
        queryKey: boardKeys.lists(),
      });
      queryClient.setQueriesData<ListSnapshot<BoardListItem>>(
        { queryKey: boardKeys.lists() },
        (old) =>
          old
            ? {
                ...old,
                items: old.items.map((item) =>
                  item.id === id ? { ...item, isPublic } : item,
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
    onSuccess: (_data, { isPublic }) => {
      toast.success(isPublic ? '공개로 변경되었습니다.' : '비공개로 변경되었습니다.');
    },
    onSettled: (_data, _error, { id }) => {
      queryClient.invalidateQueries({ queryKey: boardKeys.lists() });
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(id) });
    },
  });
}
