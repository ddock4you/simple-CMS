import { z } from 'zod';

export const userListQuerySchema = z.object({
  status: z
    .enum(['ALL', 'PENDING', 'ACTIVE', 'SUSPENDED'])
    .optional()
    .default('ALL'),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
  q: z.string().trim().min(1).max(200).optional(),
});

export const roleChangeSchema = z.object({
  roleId: z.string().min(1, '역할을 선택해주세요.'),
});
