'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { errorLogKeys } from '@/shared/api/queryKeys';
import type { FetchError } from '@/shared/api/fetchClient';

import {
  bulkResolveByFingerprint,
  setErrorLogResolved,
} from './errorLogFetchers';

export function useSetErrorLogResolved() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isResolved }: { id: string; isResolved: boolean }) =>
      setErrorLogResolved(id, isResolved),
    onSuccess: (_, { isResolved }) => {
      queryClient.invalidateQueries({ queryKey: errorLogKeys.all });
      toast.success(
        isResolved ? '해결로 표시했습니다.' : '미해결로 변경했습니다.',
      );
    },
    onError: (error: FetchError) => {
      toast.error(error.message || '상태 변경에 실패했습니다.');
    },
  });
}

export function useBulkResolveByFingerprint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      fingerprint,
      isResolved,
    }: {
      fingerprint: string;
      isResolved: boolean;
    }) => bulkResolveByFingerprint(fingerprint, isResolved),
    onSuccess: (data, { isResolved }) => {
      queryClient.invalidateQueries({ queryKey: errorLogKeys.all });
      toast.success(
        `${data.count}건을 ${isResolved ? '해결' : '미해결'} 처리했습니다.`,
      );
    },
    onError: (error: FetchError) => {
      toast.error(error.message || '일괄 처리에 실패했습니다.');
    },
  });
}
