'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { subpageFeedbackKeys } from '@/shared/api/queryKeys';
import type { FetchError } from '@/shared/api/fetchClient';

import { deleteFeedback } from './feedbackFetchers';

export function useDeleteFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteFeedback(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subpageFeedbackKeys.all });
      toast.success('피드백을 삭제했습니다.');
    },
    onError: (error: FetchError) => {
      toast.error(error.message || '피드백 삭제에 실패했습니다.');
    },
  });
}
