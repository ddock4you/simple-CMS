'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { HomeSectionListItem } from '@simple-cms/types';

import type { FetchError } from '@/shared/api/fetchClient';
import { homeKeys } from '@/shared/api/queryKeys';
import type {
  UpdateHomeSectionDto,
  ReorderHomeSectionsDto,
} from '../model/home.types';
import {
  updateHomeSection,
  reorderHomeSections,
} from './homeFetchers';

export function useUpdateHomeSection(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateHomeSectionDto) => updateHomeSection(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: homeKeys.all });
      toast.success('섹션이 저장되었습니다.');
    },
    onError: (error: FetchError) => {
      toast.error(error.message);
    },
  });
}

export function useReorderHomeSections() {
  const queryClient = useQueryClient();
  const queryKey = homeKeys.lists();

  return useMutation({
    mutationFn: (data: ReorderHomeSectionsDto) => reorderHomeSections(data),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData =
        queryClient.getQueryData<HomeSectionListItem[]>(queryKey);
      if (previousData) {
        const orderMap = new Map(
          variables.sections.map(({ id, displayOrder }) => [id, displayOrder]),
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
