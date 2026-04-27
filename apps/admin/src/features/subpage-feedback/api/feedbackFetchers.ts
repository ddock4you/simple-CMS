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

export function getFeedbackStats(
  period: number,
): Promise<FeedbackStatsResponse> {
  const params = new URLSearchParams();
  params.set('period', String(period));
  return fetchClient<FeedbackStatsResponse>(
    `/api/subpage-feedback/stats?${params.toString()}`,
  );
}

export function deleteFeedback(id: string): Promise<{ id: string }> {
  return fetchClient<{ id: string }>(`/api/subpage-feedback/${id}`, {
    method: 'DELETE',
  });
}
