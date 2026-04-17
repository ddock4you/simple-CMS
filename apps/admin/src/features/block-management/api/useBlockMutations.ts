'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type {
  CreatePageBlockDto,
  PageBlockListItem,
  ReorderPageBlocksDto,
  UpdatePageBlockDto,
} from '@simple-cms/types';

import type { FetchError } from '@/shared/api/fetchClient';
import { blockKeys } from '@/shared/api/queryKeys';

import {
  createBlock,
  deleteBlock,
  reorderBlocks,
  updateBlock,
} from './blockFetchers';

export function useCreateBlock(subpageId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePageBlockDto) => createBlock(subpageId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blockKeys.lists(subpageId) });
      toast.success('블록이 추가되었습니다.');
    },
    onError: (error: FetchError) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateBlock(subpageId: string, blockId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdatePageBlockDto) =>
      updateBlock(subpageId, blockId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blockKeys.lists(subpageId) });
      queryClient.invalidateQueries({
        queryKey: blockKeys.detail(subpageId, blockId),
      });
      toast.success('블록이 수정되었습니다.');
    },
    onError: (error: FetchError) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteBlock(subpageId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (blockId: string) => deleteBlock(subpageId, blockId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blockKeys.lists(subpageId) });
      toast.success('블록이 삭제되었습니다.');
    },
    onError: (error: FetchError) => {
      toast.error(error.message);
    },
  });
}

export function useReorderBlocks(subpageId: string) {
  const queryClient = useQueryClient();
  const queryKey = blockKeys.lists(subpageId);

  return useMutation({
    mutationFn: (data: ReorderPageBlocksDto) =>
      reorderBlocks(subpageId, data),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData =
        queryClient.getQueryData<PageBlockListItem[]>(queryKey);
      if (previousData) {
        const orderMap = new Map(
          variables.blocks.map(({ id, displayOrder }) => [id, displayOrder]),
        );
        const sorted = [...previousData]
          .map((item) => ({
            ...item,
            displayOrder: orderMap.get(item.id) ?? item.displayOrder,
          }))
          .sort((a, b) => a.displayOrder - b.displayOrder);
        queryClient.setQueryData(queryKey, sorted);
      }
      return { previousData };
    },
    onError: (error: FetchError, _vars, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      toast.error(error.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}
