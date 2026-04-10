import { z } from 'zod';

export const createRoleSchema = z.object({
  name: z
    .string()
    .min(1, '역할명을 입력해주세요.')
    .max(50, '역할명은 50자 이하여야 합니다.'),
  description: z.string().max(200).optional(),
  permissions: z.record(z.record(z.boolean())),
});

export type CreateRoleData = z.infer<typeof createRoleSchema>;

export const updateRoleSchema = z.object({
  name: z
    .string()
    .min(1, '역할명을 입력해주세요.')
    .max(50, '역할명은 50자 이하여야 합니다.')
    .optional(),
  description: z.string().max(200).optional(),
});

export type UpdateRoleData = z.infer<typeof updateRoleSchema>;

export const updatePermissionsSchema = z.object({
  permissions: z.record(z.record(z.boolean())),
});

export type UpdatePermissionsData = z.infer<typeof updatePermissionsSchema>;
