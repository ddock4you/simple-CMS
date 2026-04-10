import { z } from 'zod';

export const updateDomainSchema = z.object({
  domain: z
    .string()
    .min(1, '도메인을 입력해주세요.')
    .max(253)
    .regex(
      /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/,
      '유효한 도메인 형식이 아닙니다. (예: www.example.com)',
    ),
});

export type UpdateDomainData = z.infer<typeof updateDomainSchema>;

export const updateSecuritySchema = z.object({
  concurrentLoginEnabled: z.boolean(),
});

export type UpdateSecurityData = z.infer<typeof updateSecuritySchema>;

export const updateUploadSchema = z.object({
  allowedExtensions: z
    .array(
      z.string().regex(/^\.[a-z0-9]+$/, '확장자는 .으로 시작하고 소문자 영숫자만 허용됩니다.'),
    )
    .min(1, '허용 확장자를 최소 1개 이상 입력해주세요.'),
  allowedMimeTypes: z
    .array(
      z.string().regex(/^[a-z]+\/[a-z0-9.+\-]+$/, 'MIME 타입 형식이 올바르지 않습니다.'),
    )
    .min(1, '허용 MIME 타입을 최소 1개 이상 입력해주세요.'),
  maxFileSizeMb: z
    .number()
    .int()
    .min(1, '최소 1MB 이상이어야 합니다.')
    .max(100, '최대 100MB까지 설정 가능합니다.'),
});

export type UpdateUploadData = z.infer<typeof updateUploadSchema>;

// API 응답 타입
export interface DomainSettingsData {
  domain: string | null;
  verified: boolean;
}

export interface SecuritySettingsData {
  concurrentLoginEnabled: boolean;
}

export interface UploadSettingsData {
  allowedExtensions: string[];
  allowedMimeTypes: string[];
  maxFileSizeMb: number;
}

export interface DnsCheckResult {
  verified: boolean;
  checkedAt: string;
}
