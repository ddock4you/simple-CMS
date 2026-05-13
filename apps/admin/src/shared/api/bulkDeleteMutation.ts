'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { QueryKey } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { FetchError } from './fetchClient';

export function createBulkDeleteMutation<
  TResponse extends { deleted: string[]; blocked: unknown[] },
>({
  keys,
  mutationFn,
  messages,
}: {
  keys: { lists: () => QueryKey };
  mutationFn: (ids: string[]) => Promise<TResponse>;
  messages: {
    allSuccess: (deletedCount: number) => string;
    partial: (deletedCount: number, blockedCount: number) => string;
    allBlocked: (blockedCount: number) => string;
  };
}) {
  const useBulkDelete = (options?: { onSuccess?: (data: TResponse) => void }) => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: (ids: string[]) => mutationFn(ids),
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: keys.lists() });
        if (data.deleted.length > 0 && data.blocked.length === 0) {
          toast.success(messages.allSuccess(data.deleted.length));
        } else if (data.deleted.length > 0 && data.blocked.length > 0) {
          toast.warning(messages.partial(data.deleted.length, data.blocked.length));
        } else if (data.blocked.length > 0) {
          toast.error(messages.allBlocked(data.blocked.length));
        }
        options?.onSuccess?.(data);
      },
      onError: (error: FetchError) => {
        toast.error(error.message);
      },
    });
  };

  return useBulkDelete;
}
