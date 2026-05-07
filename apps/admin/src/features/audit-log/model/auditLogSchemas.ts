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
  from: z.string().optional(),
  to: z.string().optional(),
  action: z.string().optional(),
  entityType: z.string().optional(),
  userId: z.string().optional(),
  q: z.string().trim().min(1).max(200).optional(),
});
