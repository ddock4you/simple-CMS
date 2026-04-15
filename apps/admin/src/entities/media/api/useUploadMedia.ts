'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { UploadMediaResponse } from '@simple-cms/types';

import type { FetchError } from '@/shared/api/fetchClient';
import { mediaKeys } from '@/shared/api/queryKeys';

import { uploadMedia } from './mediaFetchers';

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
