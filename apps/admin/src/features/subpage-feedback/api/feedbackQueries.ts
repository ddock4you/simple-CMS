import { queryOptions } from '@tanstack/react-query';

import { subpageFeedbackKeys } from '@/shared/api/queryKeys';

import type { FeedbackListQuery } from '../model/feedbackFilters';
import {
  getFeedbackList,
  getFeedbackStats,
  type FeedbackStatsRange,
} from './feedbackFetchers';

export const subpageFeedbackListOptions = (filters: FeedbackListQuery) =>
  queryOptions({
    queryKey: subpageFeedbackKeys.list(filters),
    queryFn: () => getFeedbackList(filters),
  });

export const subpageFeedbackStatsOptions = (range: FeedbackStatsRange) =>
  queryOptions({
    queryKey: subpageFeedbackKeys.stats(range),
    queryFn: () => getFeedbackStats(range),
  });
