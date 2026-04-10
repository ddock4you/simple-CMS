import { z } from 'zod';

export const registerSchema = z
  .object({
    username: z
      .string()
      .min(4, '아이디는 4자 이상이어야 합니다.')
      .max(20, '아이디는 20자 이하여야 합니다.')
      .regex(
        /^[a-zA-Z0-9_]+$/,
        '아이디는 영문, 숫자, 밑줄(_)만 사용할 수 있습니다.',
      ),
    email: z
      .string()
      .email('올바른 이메일 형식이 아닙니다.')
      .or(z.literal(''))
      .transform((val) => (val === '' ? undefined : val))
      .optional(),
    password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다.'),
    passwordConfirm: z.string().min(1, '비밀번호 확인을 입력해주세요.'),
    name: z
      .string()
      .min(2, '이름은 2자 이상이어야 합니다.')
      .max(50, '이름은 50자 이하여야 합니다.'),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: '비밀번호가 일치하지 않습니다.',
    path: ['passwordConfirm'],
  });

export type RegisterFormData = z.input<typeof registerSchema>;
export type RegisterPayload = z.output<typeof registerSchema>;
