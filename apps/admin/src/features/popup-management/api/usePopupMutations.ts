'use client';

import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type {
  CreateHomePopupDto,
  UpdateHomePopupDto,
  ReorderHomePopupsDto,
} from '@simple-cms/types';

import type { FetchError } from '@/shared/api/fetchClient';
import { popupKeys } from '@/shared/api/queryKeys';

import {
  createHomePopup,
  updateHomePopup,
  deleteHomePopup,
  reorderHomePopups,
} from './popupFetchers';

export function useCreateHomePopup() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateHomePopupDto) => createHomePopup(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: popupKeys.all });
      toast.success('메인 팝업이 생성되었습니다.');
      router.push(`/home/popups/${result.id}`);
    },
    onError: (error: FetchError) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateHomePopup(id: string) {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateHomePopupDto) => updateHomePopup(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: popupKeys.all });
      toast.success('메인 팝업이 수정되었습니다.');
      router.push(`/home/popups/${id}`);
    },
    onError: (error: FetchError) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteHomePopup() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteHomePopup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: popupKeys.lists() });
      toast.success('메인 팝업이 삭제되었습니다.');
      router.push('/home/popups');
    },
    onError: (error: FetchError) => {
      toast.error(error.message);
    },
  });
}

export function useReorderHomePopups() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ReorderHomePopupsDto) => reorderHomePopups(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: popupKeys.lists() });
    },
    onError: (error: FetchError) => {
      toast.error(error.message);
    },
  });
}
