'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { FetchError } from '@/shared/api/fetchClient';
import { subpageKeys, subpageVersionKeys } from '@/shared/api/queryKeys';
import { blockKeys } from '@/shared/api/queryKeys';

import type {
  CreateVersionData,
  RollbackVersionData,
} from '../model/versionSchemas';
import {
  createSubpageVersion,
  deleteSubpageVersion,
  rollbackSubpageVersion,
  updateSubpageVersionPin,
  type RollbackResponse,
} from './versionFetchers';

function invalidateAllVersionQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  subpageId: string,
): void {
  queryClient.invalidateQueries({
    queryKey: subpageVersionKeys.lists(subpageId),
  });
  queryClient.invalidateQueries({
    queryKey: subpageVersionKeys.recent(subpageId),
  });
}

function showFetchError(error: unknown, fallback: string): void {
  if (error instanceof FetchError) {
    toast.error(error.message || fallback);
    return;
  }
  toast.error(fallback);
}

export function useCreateSubpageVersion(subpageId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateVersionData) =>
      createSubpageVersion(subpageId, data),
    onSuccess: () => {
      invalidateAllVersionQueries(queryClient, subpageId);
      toast.success('버전이 저장되었습니다.');
    },
    onError: (error) => {
      showFetchError(error, '버전 저장에 실패했습니다.');
    },
  });
}

export function useToggleSubpageVersionPin(subpageId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      versionId,
      isPinned,
    }: {
      versionId: string;
      isPinned: boolean;
    }) => updateSubpageVersionPin(subpageId, versionId, isPinned),
    onSuccess: (_data, { versionId, isPinned }) => {
      invalidateAllVersionQueries(queryClient, subpageId);
      queryClient.invalidateQueries({
        queryKey: subpageVersionKeys.detail(subpageId, versionId),
      });
      toast.success(isPinned ? '버전을 고정했습니다.' : '버전 고정을 해제했습니다.');
    },
    onError: (error) => {
      showFetchError(error, '버전 고정 상태 변경에 실패했습니다.');
    },
  });
}

export function useDeleteSubpageVersion(subpageId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (versionId: string) =>
      deleteSubpageVersion(subpageId, versionId),
    onSuccess: () => {
      invalidateAllVersionQueries(queryClient, subpageId);
      toast.success('버전을 삭제했습니다.');
    },
    onError: (error) => {
      showFetchError(error, '버전 삭제에 실패했습니다.');
    },
  });
}

export interface RollbackMutationVariables {
  versionId: string;
  data: RollbackVersionData;
}

export function useRollbackSubpageVersion(
  subpageId: string,
  options?: {
    onSuccess?: (result: RollbackResponse) => void;
  },
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ versionId, data }: RollbackMutationVariables) =>
      rollbackSubpageVersion(subpageId, versionId, data),
    onSuccess: (result) => {
      // subpage detail + block list + versions 모두 무효화
      queryClient.invalidateQueries({ queryKey: subpageKeys.detail(subpageId) });
      queryClient.invalidateQueries({ queryKey: subpageKeys.lists() });
      queryClient.invalidateQueries({ queryKey: blockKeys.lists(subpageId) });
      invalidateAllVersionQueries(queryClient, subpageId);
      toast.success('이전 버전의 내용으로 복원되었습니다.');
      options?.onSuccess?.(result);
    },
    onError: (error) => {
      if (error instanceof FetchError && error.code === 'REVISION_MISMATCH') {
        toast.error(error.message);
        // 서브페이지 상세를 invalidate하여 최신 revision 동기화
        queryClient.invalidateQueries({
          queryKey: subpageKeys.detail(subpageId),
        });
        return;
      }
      showFetchError(error, '버전 복원에 실패했습니다.');
    },
  });
}
