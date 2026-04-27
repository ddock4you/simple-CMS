import type {
  FeedbackPositiveReason,
  FeedbackRating,
} from '../domain/feedback.types';

export interface CreateFeedbackDto {
  subpageId: string;
  rating: FeedbackRating;
  positiveReasons?: FeedbackPositiveReason[];
  comment?: string;
}

export interface FeedbackListItem {
  id: string;
  subpageId: string;
  subpageTitle: string;
  subpageSlug: string;
  rating: FeedbackRating;
  positiveReasons: FeedbackPositiveReason[];
  comment: string | null;
  createdAt: string;
}

export interface FeedbackListFilters {
  subpageId?: string;
  rating?: FeedbackRating;
  from?: string;
  to?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface FeedbackListResponse {
  items: FeedbackListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface FeedbackOverallStats {
  total: number;
  positive: number;
  negative: number;
  positiveRate: number;
  avgPerDay: number;
}

export interface FeedbackDailyPoint {
  date: string;
  positive: number;
  negative: number;
}

export interface FeedbackBySubpageItem {
  subpageId: string;
  subpageTitle: string;
  subpageSlug: string;
  total: number;
  positive: number;
  negative: number;
  positiveRate: number;
}

export interface FeedbackPositiveReasonStat {
  code: FeedbackPositiveReason;
  count: number;
}

export interface FeedbackStatsResponse {
  periodDays: number;
  overall: FeedbackOverallStats;
  daily: FeedbackDailyPoint[];
  bySubpage: FeedbackBySubpageItem[];
  topPositiveReasons: FeedbackPositiveReasonStat[];
}
