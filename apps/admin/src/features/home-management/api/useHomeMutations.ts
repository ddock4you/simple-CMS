'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

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
  return useMutation({
    mutationFn: (data: ReorderHomeSectionsDto) => reorderHomeSections(data),
  });
}
