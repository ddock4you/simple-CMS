'use client';

import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { FetchError } from '@/shared/api/fetchClient';
import { subpageKeys } from '@/shared/api/queryKeys';

import type { CreateSubpageData, UpdateSubpageData } from '../model/subpageSchemas';
import { createSubpage, updateSubpage, deleteSubpage } from './subpageFetchers';

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
      toast.success('서브 페이지가 수정되었습니다.');
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
