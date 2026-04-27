import { z } from 'zod';

export const feedbackListQuerySchema = z.object({
  subpageId: z.string().optional(),
  rating: z.enum(['POSITIVE', 'NEGATIVE', 'ALL']).default('ALL'),
  from: z.string().optional(),
  to: z.string().optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type FeedbackListQuery = z.infer<typeof feedbackListQuerySchema>;

export const feedbackStatsQuerySchema = z.object({
  period: z.coerce.number().int().min(1).max(365).default(30),
});

export type FeedbackStatsQuery = z.infer<typeof feedbackStatsQuerySchema>;
