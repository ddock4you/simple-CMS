import { z } from 'zod';

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, '날짜는 YYYY-MM-DD 형식이어야 합니다.');

export const feedbackExportQuerySchema = z
  .object({
    from: dateString.optional(),
    to: dateString.optional(),
    rating: z.enum(['POSITIVE', 'NEGATIVE', 'ALL']).default('ALL'),
    subpageId: z.string().optional(),
    q: z.string().optional(),
  })
  .refine((data) => !(data.from && data.to) || data.from <= data.to, {
    message: '시작일은 종료일보다 이전이어야 합니다.',
    path: ['to'],
  });

export type FeedbackExportQuery = z.infer<typeof feedbackExportQuerySchema>;
