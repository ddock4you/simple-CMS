'use client';

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { FetchError } from '@/shared/api/fetchClient';

import { issuePreviewToken } from './previewFetchers';

export function useIssuePreviewToken() {
  return useMutation({
    mutationFn: issuePreviewToken,
    onSuccess: (data) => {
      window.open(data.webPreviewUrl, '_blank', 'noopener');
    },
    onError: (error: FetchError) => {
      toast.error(error.message);
    },
  });
}
