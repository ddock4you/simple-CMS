import { queryOptions } from '@tanstack/react-query';

import { subpageFeedbackKeys } from '@/shared/api/queryKeys';

import type { FeedbackListQuery } from '../model/feedbackFilters';
import { getFeedbackList, getFeedbackStats } from './feedbackFetchers';

export const subpageFeedbackListOptions = (filters: FeedbackListQuery) =>
  queryOptions({
    queryKey: subpageFeedbackKeys.list(filters),
    queryFn: () => getFeedbackList(filters),
  });

export const subpageFeedbackStatsOptions = (period: number) =>
  queryOptions({
    queryKey: subpageFeedbackKeys.stats(period),
    queryFn: () => getFeedbackStats(period),
  });
