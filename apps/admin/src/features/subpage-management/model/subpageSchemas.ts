import { z } from 'zod';

export const subpageListQuerySchema = z.object({
  status: z.enum(['ALL', 'DRAFT', 'PUBLISHED']).optional().default('ALL'),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
});

const cclTypeSchema = z
  .enum(['TYPE_0', 'TYPE_1', 'TYPE_2', 'TYPE_3', 'TYPE_4'])
  .nullable();

export const createSubpageSchema = z
  .object({
    title: z
      .string()
      .min(1, '제목을 입력해주세요.')
      .max(200, '제목은 200자 이하여야 합니다.'),
    slug: z.string().max(200).optional(),
    seoTitle: z.string().max(200).optional(),
    seoDescription: z.string().max(500).optional(),
    status: z.enum(['DRAFT', 'PUBLISHED']).optional().default('DRAFT'),
    cclType: cclTypeSchema.optional().default(null),
    cclAi: z.boolean().optional().default(false),
    feedbackEnabled: z.boolean().optional().default(false),
  })
  .superRefine((data, ctx) => {
    if (data.cclType === null && data.cclAi) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['cclAi'],
        message: '공공누리 유형을 선택해야 AI 표시를 사용할 수 있습니다.',
      });
    }
  });

export type CreateSubpageData = z.infer<typeof createSubpageSchema>;

export const updateSubpageSchema = z
  .object({
    title: z
      .string()
      .min(1, '제목을 입력해주세요.')
      .max(200, '제목은 200자 이하여야 합니다.')
      .optional(),
    slug: z.string().max(200).optional(),
    seoTitle: z.string().max(200).optional().nullable(),
    seoDescription: z.string().max(500).optional().nullable(),
    status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
    cclType: cclTypeSchema.optional(),
    cclAi: z.boolean().optional(),
    feedbackEnabled: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.cclType === null && data.cclAi === true) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['cclAi'],
        message: '공공누리 유형을 선택해야 AI 표시를 사용할 수 있습니다.',
      });
    }
  });

export type UpdateSubpageData = z.infer<typeof updateSubpageSchema>;
