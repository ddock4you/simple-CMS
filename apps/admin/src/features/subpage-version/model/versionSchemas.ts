import { SUBPAGE_VERSION_LABEL_MAX_LENGTH } from '@simple-cms/types';
import { z } from 'zod';

export const createVersionSchema = z.object({
  label: z
    .string()
    .max(
      SUBPAGE_VERSION_LABEL_MAX_LENGTH,
      `메모는 ${SUBPAGE_VERSION_LABEL_MAX_LENGTH.toLocaleString()}자 이내여야 합니다.`,
    )
    .optional()
    .nullable(),
});

export type CreateVersionData = z.infer<typeof createVersionSchema>;

export const rollbackVersionSchema = z.object({
  expectedRevision: z.number().int().nonnegative(),
  statusStrategy: z.enum(['KEEP_CURRENT', 'APPLY_VERSION']).optional(),
  acknowledgeDangling: z.boolean().optional(),
});

export type RollbackVersionData = z.infer<typeof rollbackVersionSchema>;
