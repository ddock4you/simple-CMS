import { z } from 'zod';

export const auditLogListQuerySchema = z.object({
  action: z.enum(['ALL', 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT']).optional().default('ALL'),
  entityType: z.string().optional(),
  userId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
  q: z.string().trim().min(1).max(200).optional(),
});

export const auditLogExportQuerySchema = z.object({
  from: z.string().min(1, '시작일을 선택해주세요.'),
  to: z.string().min(1, '종료일을 선택해주세요.'),
  action: z.string().optional(),
  entityType: z.string().optional(),
  userId: z.string().optional(),
});
