export const FEEDBACK_POSITIVE_REASONS = {
  FOUND_INFO: '필요한 정보를 찾음',
  LIKED_CONTENT: '내용이 마음에 듦',
  EASY_TO_UNDERSTAND: '내용을 이해하기 쉬움',
} as const;

export type FeedbackPositiveReason = keyof typeof FEEDBACK_POSITIVE_REASONS;

export const FEEDBACK_POSITIVE_REASON_CODES = Object.keys(
  FEEDBACK_POSITIVE_REASONS,
) as FeedbackPositiveReason[];

export const FEEDBACK_RATING_LABELS = {
  POSITIVE: '네',
  NEGATIVE: '아니오',
} as const;

export type FeedbackRating = keyof typeof FEEDBACK_RATING_LABELS;

export const FEEDBACK_COMMENT_MAX_LENGTH = 1000;

export const FEEDBACK_RATE_LIMIT_HOURS = 24;

export const FEEDBACK_RETENTION_DAYS = 365;
