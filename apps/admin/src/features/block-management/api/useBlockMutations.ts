'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type {
  CreatePageBlockDto,
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

  return useMutation({
    mutationFn: (data: ReorderPageBlocksDto) =>
      reorderBlocks(subpageId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blockKeys.lists(subpageId) });
    },
    onError: (error: FetchError) => {
      toast.error(error.message);
    },
  });
}
