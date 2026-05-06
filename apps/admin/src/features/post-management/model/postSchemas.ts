import { z } from 'zod';

export const postListQuerySchema = z.object({
  status: z.enum(['ALL', 'DRAFT', 'PUBLISHED']).optional().default('ALL'),
  boardId: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
  q: z.string().trim().min(1).max(200).optional(),
});

export const createPostSchema = z.object({
  title: z
    .string()
    .min(1, '제목을 입력해주세요.')
    .max(200, '제목은 200자 이하여야 합니다.'),
  slug: z.string().max(200).optional(),
  boardId: z.string().min(1, '게시판을 선택해주세요.'),
  seoTitle: z
    .string()
    .max(200, 'SEO 제목은 200자 이내로 입력해주세요.')
    .optional(),
  seoDescription: z
    .string()
    .max(500, 'SEO 설명은 500자 이내로 입력해주세요.')
    .optional(),
  contentJson: z.any().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional().default('DRAFT'),
});

export type CreatePostData = z.infer<typeof createPostSchema>;

export const updatePostSchema = z.object({
  title: z
    .string()
    .min(1, '제목을 입력해주세요.')
    .max(200, '제목은 200자 이하여야 합니다.')
    .optional(),
  slug: z.string().max(200).optional(),
  boardId: z.string().min(1).optional(),
  seoTitle: z
    .string()
    .max(200, 'SEO 제목은 200자 이내로 입력해주세요.')
    .optional()
    .nullable(),
  seoDescription: z
    .string()
    .max(500, 'SEO 설명은 500자 이내로 입력해주세요.')
    .optional()
    .nullable(),
  contentJson: z.any().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
});

export type UpdatePostData = z.infer<typeof updatePostSchema>;
