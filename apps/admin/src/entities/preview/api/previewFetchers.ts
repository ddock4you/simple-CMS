import type {
  IssuePreviewTokenDto,
  PreviewTokenResponse,
} from '@simple-cms/types';

import { fetchClient } from '@/shared/api/fetchClient';

export function issuePreviewToken(
  data: IssuePreviewTokenDto,
): Promise<PreviewTokenResponse> {
  return fetchClient<PreviewTokenResponse>('/api/preview/token', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
