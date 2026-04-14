import { z } from 'zod';

/**
 * 미디어 라이브러리 zod 스키마 (API Route 입력 검증).
 */

export const mediaListQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  /** MIME 접두어(`image`) 또는 정확 일치(`image/png`) */
  mimeType: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(24),
});

export type MediaListQuery = z.infer<typeof mediaListQuerySchema>;

export const updateMediaSchema = z.object({
  alt: z.string().max(500).nullable().optional(),
});

export type UpdateMediaData = z.infer<typeof updateMediaSchema>;
