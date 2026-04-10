import { z } from 'zod';

export const profileSchema = z.object({
  name: z
    .string()
    .min(2, '이름은 2자 이상이어야 합니다.')
    .max(50, '이름은 50자 이하여야 합니다.'),
  email: z
    .string()
    .email('올바른 이메일 형식이 아닙니다.')
    .or(z.literal(''))
    .transform((val) => (val === '' ? undefined : val))
    .optional(),
});

export type ProfileFormData = z.input<typeof profileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, '현재 비밀번호를 입력해주세요.'),
    newPassword: z
      .string()
      .min(8, '새 비밀번호는 8자 이상이어야 합니다.'),
    newPasswordConfirm: z
      .string()
      .min(1, '새 비밀번호 확인을 입력해주세요.'),
  })
  .refine((data) => data.newPassword === data.newPasswordConfirm, {
    message: '새 비밀번호가 일치하지 않습니다.',
    path: ['newPasswordConfirm'],
  });

export type ChangePasswordFormData = z.input<typeof changePasswordSchema>;
