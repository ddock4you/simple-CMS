'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { HomePopupListItem, CreateHomePopupDto, UpdateHomePopupDto, ReorderHomePopupsDto } from '@simple-cms/types';

import type { FetchError } from '@/shared/api/fetchClient';
import { popupKeys } from '@/shared/api/queryKeys';
import { createCrudMutations } from '@/shared/api/crudMutations';

import {
  createHomePopup,
  updateHomePopup,
  deleteHomePopup,
  reorderHomePopups,
  toggleHomePopupVisibility,
} from './popupFetchers';

const {
  useCreate: useCreateHomePopup,
  useUpdate: useUpdateHomePopup,
  useDelete: useDeleteHomePopup,
} = createCrudMutations<CreateHomePopupDto, UpdateHomePopupDto, { id: string }>({
  keys: popupKeys,
  endpoints: {
    create: createHomePopup,
    update: updateHomePopup,
    delete: deleteHomePopup,
  },
  messages: {
    create: '메인 팝업이 생성되었습니다.',
    update: '메인 팝업이 수정되었습니다.',
    delete: '메인 팝업이 삭제되었습니다.',
  },
  routerPaths: {
    afterCreate: (result) => `/popups/${result.id}`,
    afterUpdate: (id) => `/popups/${id}`,
    afterDelete: '/popups',
  },
});

export function useReorderHomePopups() {
  return useMutation({
    mutationFn: (data: ReorderHomePopupsDto) => reorderHomePopups(data),
  });
}

export function useToggleHomePopupVisibility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isVisible }: { id: string; isVisible: boolean }) =>
      toggleHomePopupVisibility(id, isVisible),
    onMutate: async ({ id, isVisible }) => {
      await queryClient.cancelQueries({ queryKey: popupKeys.lists() });
      const previousLists = queryClient.getQueriesData<HomePopupListItem[]>({
        queryKey: popupKeys.lists(),
      });
      queryClient.setQueriesData<HomePopupListItem[]>(
        { queryKey: popupKeys.lists() },
        (old) => old ? old.map((item) => item.id === id ? { ...item, isVisible } : item) : old,
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
    onSuccess: (_data, { isVisible }) => {
      toast.success(isVisible ? '노출되었습니다.' : '숨김으로 변경되었습니다.');
    },
    onSettled: (_data, _error, { id }) => {
      queryClient.invalidateQueries({ queryKey: popupKeys.lists() });
      queryClient.invalidateQueries({ queryKey: popupKeys.detail(id) });
    },
  });
}

export { useCreateHomePopup, useUpdateHomePopup, useDeleteHomePopup };
