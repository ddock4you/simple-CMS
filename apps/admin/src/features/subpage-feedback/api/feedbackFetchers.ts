import type {
  FeedbackListResponse,
  FeedbackStatsResponse,
} from '@simple-cms/types';

import { fetchClient } from '@/shared/api/fetchClient';

import type { FeedbackListQuery } from '../model/feedbackFilters';

export function getFeedbackList(
  filters: FeedbackListQuery,
): Promise<FeedbackListResponse> {
  const params = new URLSearchParams();
  if (filters.subpageId) params.set('subpageId', filters.subpageId);
  if (filters.rating !== 'ALL') params.set('rating', filters.rating);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.q) params.set('q', filters.q);
  params.set('page', String(filters.page));
  params.set('pageSize', String(filters.pageSize));

  return fetchClient<FeedbackListResponse>(
    `/api/subpage-feedback?${params.toString()}`,
  );
}

export interface FeedbackStatsRange {
  from?: string;
  to?: string;
}

export function getFeedbackStats(
  range: FeedbackStatsRange,
): Promise<FeedbackStatsResponse> {
  const params = new URLSearchParams();
  if (range.from) params.set('from', range.from);
  if (range.to) params.set('to', range.to);
  const qs = params.toString();
  return fetchClient<FeedbackStatsResponse>(
    qs ? `/api/subpage-feedback/stats?${qs}` : '/api/subpage-feedback/stats',
  );
}

export function deleteFeedback(id: string): Promise<{ id: string }> {
  return fetchClient<{ id: string }>(`/api/subpage-feedback/${id}`, {
    method: 'DELETE',
  });
}
