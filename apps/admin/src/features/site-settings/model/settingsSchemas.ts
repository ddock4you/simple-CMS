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

export const updateBrandingSchema = z.object({
  siteName: z
    .string()
    .min(1, '사이트명을 입력해주세요.')
    .max(60, '사이트명은 60자 이내로 입력해주세요.'),
  siteDescription: z
    .string()
    .max(200, '사이트 설명은 200자 이내로 입력해주세요.')
    .nullable(),
  logoMediaId: z.string().nullable(),
  logoAlt: z
    .string()
    .max(120, '로고 대체 텍스트는 120자 이내로 입력해주세요.')
    .nullable(),
  faviconMediaId: z.string().nullable(),
  ogImageMediaId: z.string().nullable(),
});

export type UpdateBrandingData = z.infer<typeof updateBrandingSchema>;

/**
 * SEO 설정 (Stage 9 Phase 1).
 * - robotsAdditionalDisallow: `/api/`는 기본 disallow이므로 중복 시 서버에서 제거.
 *   각 경로는 `/`로 시작해야 함. 빈 문자열·공백은 제출 전 필터링.
 */
export const updateSeoSchema = z.object({
  robotsAdditionalDisallow: z
    .array(
      z
        .string()
        .trim()
        .min(1, '빈 경로는 허용되지 않습니다.')
        .max(200, '경로는 200자 이내로 입력해주세요.')
        .regex(/^\//, '경로는 "/"로 시작해야 합니다.'),
    )
    .max(50, '추가 Disallow 경로는 최대 50개까지 설정 가능합니다.'),
});

export type UpdateSeoData = z.infer<typeof updateSeoSchema>;

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

/**
 * 브랜딩 설정 GET 응답.
 * mediaId는 입력/저장의 단일 출처, *Url은 표시용으로 GET 응답 시 Media.url을 join.
 */
export interface BrandingSettingsData {
  siteName: string;
  siteDescription: string | null;
  logoMediaId: string | null;
  logoUrl: string | null;
  logoAlt: string | null;
  faviconMediaId: string | null;
  faviconUrl: string | null;
  ogImageMediaId: string | null;
  ogImageUrl: string | null;
}

/**
 * DELETE 쿼리 파라미터 — 단일 자산만 제거.
 * - logo: SITE_LOGO_MEDIA_ID + SITE_LOGO_ALT
 * - favicon: SITE_FAVICON_MEDIA_ID
 * - og: SITE_OG_IMAGE_MEDIA_ID
 */
export type BrandingAssetKind = 'logo' | 'favicon' | 'og';

/**
 * SEO 설정 GET 응답.
 * baseUrl/sitemapUrl은 읽기 전용 — 서버에서 현재 `getSiteUrl()` 파생값을 내려주어 UI에서 링크/안내 표시.
 */
export interface SeoSettingsData {
  robotsAdditionalDisallow: string[];
  baseUrl: string;
  sitemapUrl: string;
}
