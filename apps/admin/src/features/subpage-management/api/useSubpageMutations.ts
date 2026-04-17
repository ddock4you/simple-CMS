'use client';

import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { ContentStatus } from '@simple-cms/db';

import type { FetchError } from '@/shared/api/fetchClient';
import { subpageKeys } from '@/shared/api/queryKeys';

import type { CreateSubpageData, UpdateSubpageData } from '../model/subpageSchemas';
import type { SubpageListItem } from '../model/subpageFilters';
import {
  createSubpage,
  updateSubpage,
  deleteSubpage,
  toggleSubpageStatus,
  bulkDeleteSubpages,
  bulkUpdateSubpageStatus,
  type BulkDeleteSubpageResponse,
  type BulkStatusSubpageResponse,
} from './subpageFetchers';

export function useCreateSubpage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSubpageData) => createSubpage(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: subpageKeys.lists() });
      toast.success('서브 페이지가 생성되었습니다.');
      router.push(`/subpages/${result.id}`);
    },
    onError: (error: FetchError) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateSubpage(id: string) {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateSubpageData) => updateSubpage(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subpageKeys.lists() });
      queryClient.invalidateQueries({ queryKey: subpageKeys.detail(id) });
      toast.success('기본 정보가 저장되었습니다.');
      router.push(`/subpages/${id}`);
    },
    onError: (error: FetchError) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteSubpage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteSubpage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subpageKeys.lists() });
      toast.success('서브 페이지가 삭제되었습니다.');
      router.push('/subpages');
    },
    onError: (error: FetchError) => {
      toast.error(error.message);
    },
  });
}

interface ListSnapshot<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export function useToggleSubpageStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ContentStatus }) =>
      toggleSubpageStatus(id, status),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: subpageKeys.lists() });
      const previousLists = queryClient.getQueriesData<ListSnapshot<SubpageListItem>>({
        queryKey: subpageKeys.lists(),
      });
      queryClient.setQueriesData<ListSnapshot<SubpageListItem>>(
        { queryKey: subpageKeys.lists() },
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
      queryClient.invalidateQueries({ queryKey: subpageKeys.lists() });
      queryClient.invalidateQueries({ queryKey: subpageKeys.detail(id) });
    },
  });
}

export function useBulkDeleteSubpages(options?: {
  onSuccess?: (data: BulkDeleteSubpageResponse) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => bulkDeleteSubpages(ids),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: subpageKeys.lists() });
      if (data.deleted.length > 0 && data.blocked.length === 0) {
        toast.success(`${data.deleted.length}개 서브 페이지가 삭제되었습니다.`);
      } else if (data.deleted.length > 0 && data.blocked.length > 0) {
        toast.warning(
          `${data.deleted.length}개 삭제, ${data.blocked.length}개는 참조 중이라 제외되었습니다.`,
        );
      } else if (data.blocked.length > 0) {
        toast.error(`선택한 ${data.blocked.length}개 모두 참조 중이라 삭제할 수 없습니다.`);
      }
      options?.onSuccess?.(data);
    },
    onError: (error: FetchError) => {
      toast.error(error.message);
    },
  });
}

export function useBulkUpdateSubpageStatus(options?: {
  onSuccess?: (data: BulkStatusSubpageResponse) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: ContentStatus }) =>
      bulkUpdateSubpageStatus(ids, status),
    onSuccess: (data, { status }) => {
      queryClient.invalidateQueries({ queryKey: subpageKeys.lists() });
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

