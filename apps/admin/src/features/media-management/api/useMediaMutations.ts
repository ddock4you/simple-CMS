'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type {
  BulkDeleteMediaResponse,
  UpdateMediaDto,
  UploadMediaResponse,
} from '@simple-cms/types';

import type { FetchError } from '@/shared/api/fetchClient';
import { mediaKeys } from '@/shared/api/queryKeys';

import {
  bulkDeleteMedia,
  deleteMedia,
  updateMedia,
  uploadMedia,
} from './mediaFetchers';

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
      // 기본 동작으로 메시지 노출.
      toast.error(error.message);
    },
  });
}

/**
 * 일괄 삭제 — 응답에 `deleted`와 `blocked`가 함께 오므로 토스트를 분기 표시.
 * blocked 세부 내용은 호출자(Dialog)가 표시.
 */
export function useBulkDeleteMedia(options?: {
  onSuccess?: (data: BulkDeleteMediaResponse) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => bulkDeleteMedia(ids),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: mediaKeys.lists() });
      if (data.deleted.length > 0 && data.blocked.length === 0) {
        toast.success(`${data.deleted.length}개 미디어가 삭제되었습니다.`);
      } else if (data.deleted.length > 0 && data.blocked.length > 0) {
        toast.warning(
          `${data.deleted.length}개 삭제, ${data.blocked.length}개는 사용 중이라 제외되었습니다.`,
        );
      } else if (data.blocked.length > 0) {
        toast.error(
          `선택한 ${data.blocked.length}개 모두 사용 중이라 삭제할 수 없습니다.`,
        );
      }
      options?.onSuccess?.(data);
    },
    onError: (error: FetchError) => {
      toast.error(error.message);
    },
  });
}

export interface UploadMediaInput {
  file: File;
  category?: string;
}

export function useUploadMedia(options?: {
  onSuccess?: (data: UploadMediaResponse) => void;
  /** 토스트 자동 표시 여부 (기본 true). MediaPicker 등 자체 처리하는 경우 false */
  silent?: boolean;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, category }: UploadMediaInput) =>
      uploadMedia(file, category),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: mediaKeys.lists() });
      if (!options?.silent) {
        toast.success(
          data.reused
            ? '동일한 파일이 라이브러리에 있어 재사용했습니다.'
            : '업로드되었습니다.',
        );
      }
      options?.onSuccess?.(data);
    },
    onError: (error: FetchError) => {
      toast.error(error.message);
    },
  });
}
