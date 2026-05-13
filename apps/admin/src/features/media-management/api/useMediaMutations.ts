'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { BulkDeleteMediaResponse, UpdateMediaDto } from '@simple-cms/types';

import type { FetchError } from '@/shared/api/fetchClient';
import { mediaKeys } from '@/shared/api/queryKeys';
import { createBulkDeleteMutation } from '@/shared/api/bulkDeleteMutation';

import { bulkDeleteMedia, deleteMedia, updateMedia } from '@/entities/media/api/mediaFetchers';

export function useUpdateMedia(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateMediaDto) => updateMedia(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mediaKeys.lists() });
      queryClient.invalidateQueries({ queryKey: mediaKeys.detail(id) });
      toast.success('미디어 정보가 수정되었습니다.');
    },
    onError: (error: FetchError) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteMedia(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mediaKeys.lists() });
      toast.success('미디어가 삭제되었습니다.');
    },
    onError: (error: FetchError) => {
      // 409(참조 차단)는 호출자가 직접 처리하므로 토스트는 호출자에 위임 가능.
      toast.error(error.message);
    },
  });
}

// blocked 세부 내용은 호출자(Dialog)가 표시.
export const useBulkDeleteMedia = createBulkDeleteMutation<BulkDeleteMediaResponse>({
  keys: mediaKeys,
  mutationFn: bulkDeleteMedia,
  messages: {
    allSuccess: (count) => `${count}개 미디어가 삭제되었습니다.`,
    partial: (deleted, blocked) =>
      `${deleted}개 삭제, ${blocked}개는 사용 중이라 제외되었습니다.`,
    allBlocked: (count) => `선택한 ${count}개 모두 사용 중이라 삭제할 수 없습니다.`,
  },
});
