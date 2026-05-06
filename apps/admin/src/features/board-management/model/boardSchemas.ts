import { z } from 'zod';

export const boardListQuerySchema = z.object({
  visibility: z
    .enum(['ALL', 'PUBLIC', 'PRIVATE'])
    .optional()
    .default('ALL'),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
  q: z.string().trim().min(1).max(200).optional(),
});

export const createBoardSchema = z.object({
  name: z
    .string()
    .min(1, '게시판 이름을 입력해주세요.')
    .max(200, '게시판 이름은 200자 이하여야 합니다.'),
  slug: z.string().max(200).optional(),
  description: z.string().max(500).optional(),
  skinType: z.enum(['LIST', 'GALLERY']).optional().default('LIST'),
  isPublic: z.boolean().optional().default(true),
});

export type CreateBoardData = z.infer<typeof createBoardSchema>;

export const updateBoardSchema = z.object({
  name: z
    .string()
    .min(1, '게시판 이름을 입력해주세요.')
    .max(200, '게시판 이름은 200자 이하여야 합니다.')
    .optional(),
  slug: z.string().max(200).optional(),
  description: z.string().max(500).optional().nullable(),
  skinType: z.enum(['LIST', 'GALLERY']).optional(),
  isPublic: z.boolean().optional(),
});

export type UpdateBoardData = z.infer<typeof updateBoardSchema>;
