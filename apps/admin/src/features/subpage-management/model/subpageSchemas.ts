import { z } from 'zod';

export const subpageListQuerySchema = z.object({
  status: z.enum(['ALL', 'DRAFT', 'PUBLISHED']).optional().default('ALL'),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
});

export const createSubpageSchema = z.object({
  title: z
    .string()
    .min(1, '제목을 입력해주세요.')
    .max(200, '제목은 200자 이하여야 합니다.'),
  slug: z.string().max(200).optional(),
  seoTitle: z.string().max(200).optional(),
  seoDescription: z.string().max(500).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional().default('DRAFT'),
});

export type CreateSubpageData = z.infer<typeof createSubpageSchema>;

export const updateSubpageSchema = z.object({
  title: z
    .string()
    .min(1, '제목을 입력해주세요.')
    .max(200, '제목은 200자 이하여야 합니다.')
    .optional(),
  slug: z.string().max(200).optional(),
  seoTitle: z.string().max(200).optional().nullable(),
  seoDescription: z.string().max(500).optional().nullable(),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
});

export type UpdateSubpageData = z.infer<typeof updateSubpageSchema>;
