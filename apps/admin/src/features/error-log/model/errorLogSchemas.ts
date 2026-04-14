import { z } from 'zod';

export const errorLogListQuerySchema = z.object({
  level: z.enum(['ALL', 'ERROR', 'WARN']).optional().default('ALL'),
  source: z
    .enum([
      'ALL',
      'SERVER_SSR',
      'SERVER_API',
      'SERVER_MIDDLEWARE',
      'CLIENT_REACT',
      'CLIENT_JS',
    ])
    .optional()
    .default('ALL'),
  resolved: z.enum(['all', 'unresolved', 'resolved']).optional().default('all'),
  urlPattern: z.string().optional(),
  search: z.string().optional(),
  groupByFingerprint: z.coerce.boolean().optional().default(false),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
});

export const errorLogResolveBodySchema = z.object({
  isResolved: z.boolean(),
});

export const errorLogBulkResolveBodySchema = z.object({
  fingerprint: z.string().min(1),
  isResolved: z.boolean(),
});
