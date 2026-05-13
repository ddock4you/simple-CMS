'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { QueryKey } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { ContentStatus } from '@simple-cms/db';

import type { FetchError } from './fetchClient';

export function createBulkStatusMutation<
  TResponse extends { updated: string[]; failed: unknown[] },
>({
  keys,
  mutationFn,
}: {
  keys: { lists: () => QueryKey };
  mutationFn: (ids: string[], status: ContentStatus) => Promise<TResponse>;
}) {
  const useBulkStatus = (options?: { onSuccess?: (data: TResponse) => void }) => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: ({ ids, status }: { ids: string[]; status: ContentStatus }) =>
        mutationFn(ids, status),
      onSuccess: (data, { status }) => {
        queryClient.invalidateQueries({ queryKey: keys.lists() });
        const label = status === 'PUBLISHED' ? '발행' : '초안';
        if (data.updated.length > 0 && data.failed.length === 0) {
          toast.success(`${data.updated.length}개 ${label} 처리되었습니다.`);
        } else if (data.failed.length > 0) {
          toast.warning(`${data.updated.length}개 처리, ${data.failed.length}개 실패`);
        }
        options?.onSuccess?.(data);
      },
      onError: (error: FetchError) => {
        toast.error(error.message);
      },
    });
  };

  return useBulkStatus;
}
