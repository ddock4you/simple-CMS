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

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, '날짜는 YYYY-MM-DD 형식이어야 합니다.');

export const feedbackStatsQuerySchema = z
  .object({
    from: dateString.optional(),
    to: dateString.optional(),
  })
  .refine((data) => !(data.from && data.to) || data.from <= data.to, {
    message: '시작일은 종료일보다 이전이어야 합니다.',
    path: ['to'],
  });

export type FeedbackStatsQuery = z.infer<typeof feedbackStatsQuerySchema>;
