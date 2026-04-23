import { NextResponse } from 'next/server';

import {
  deleteSiteSetting,
  getSiteSettings,
  logAuditEvent,
  prisma,
  setSiteSetting,
} from '@simple-cms/db';
import type { ApiResponse } from '@simple-cms/types';

import { requirePermission } from '@/entities/auth/lib/requirePermission';
import { getAuditContext } from '@/shared/lib/auditHelpers';
import {
  updateBrandingSchema,
  type BrandingAssetKind,
  type BrandingSettingsData,
} from '@/features/site-settings/model/settingsSchemas';

/**
 * /api/settings/branding (Stage 7l)
 *
 * 사이트 브랜딩 + SEO 메타데이터 통합 관리.
 * 6개 SiteSettings 키:
 * - SITE_NAME, SITE_DESCRIPTION
 * - SITE_LOGO_MEDIA_ID, SITE_LOGO_ALT
 * - SITE_FAVICON_MEDIA_ID
 * - SITE_OG_IMAGE_MEDIA_ID
 *
 * mediaId만 저장하고 url은 GET 응답 시 Media join — 단일 출처 + Media 삭제 시 자동 일관성.
 */

const SETTING_KEYS = {
  siteName: 'SITE_NAME',
  siteDescription: 'SITE_DESCRIPTION',
  logoMediaId: 'SITE_LOGO_MEDIA_ID',
  logoAlt: 'SITE_LOGO_ALT',
  faviconMediaId: 'SITE_FAVICON_MEDIA_ID',
  ogImageMediaId: 'SITE_OG_IMAGE_MEDIA_ID',
} as const;

const SETTING_DESCRIPTIONS: Record<string, string> = {
  SITE_NAME: '사이트명 (헤더 폴백 텍스트, 메타데이터 title)',
  SITE_DESCRIPTION: '사이트 설명 (메타데이터 description)',
  SITE_LOGO_MEDIA_ID: '헤더 로고 Media.id',
  SITE_LOGO_ALT: '로고 대체 텍스트 (sr-only)',
  SITE_FAVICON_MEDIA_ID: '파비콘 Media.id',
  SITE_OG_IMAGE_MEDIA_ID: 'OG 이미지 Media.id (1200x630)',
};

/**
 * 키별 MIME 화이트리스트.
 * branding-upload는 5종 합집합을 허용하지만 PATCH 시 키별로 다시 좁힌다.
 * - 로고/OG: PNG/JPG/WEBP만
 * - 파비콘: PNG/WEBP/ICO 4종
 *
 * MediaPicker로 라이브러리 SVG를 선택해도 여기서 차단됨 (defense-in-depth).
 */
const MIME_RULES: Record<
  'logoMediaId' | 'faviconMediaId' | 'ogImageMediaId',
  { allowed: Set<string>; label: string }
> = {
  logoMediaId: {
    allowed: new Set(['image/jpeg', 'image/png', 'image/webp']),
    label: '로고는 PNG, JPG, WEBP만 사용할 수 있습니다.',
  },
  faviconMediaId: {
    allowed: new Set([
      'image/png',
      'image/webp',
      'image/x-icon',
      'image/vnd.microsoft.icon',
    ]),
    label: '파비콘은 PNG, WEBP, ICO만 사용할 수 있습니다.',
  },
  ogImageMediaId: {
    allowed: new Set(['image/jpeg', 'image/png', 'image/webp']),
    label: 'OG 이미지는 PNG, JPG, WEBP만 사용할 수 있습니다.',
  },
};

export async function GET(_request: Request): Promise<NextResponse> {
  const { error } = await requirePermission('settings', 'read');
  if (error) return error;

  try {
    const values = await getSiteSettings(Object.values(SETTING_KEYS));

    const mediaIds = [
      values[SETTING_KEYS.logoMediaId],
      values[SETTING_KEYS.faviconMediaId],
      values[SETTING_KEYS.ogImageMediaId],
    ].filter((v): v is string => Boolean(v));

    let urlByMediaId = new Map<string, string>();
    if (mediaIds.length > 0) {
      const medias = await prisma.media.findMany({
        where: { id: { in: mediaIds } },
        select: { id: true, url: true },
      });
      urlByMediaId = new Map(medias.map((m) => [m.id, m.url]));
    }

    const data: BrandingSettingsData = {
      siteName: values[SETTING_KEYS.siteName] ?? 'Simple CMS',
      siteDescription: values[SETTING_KEYS.siteDescription],
      logoMediaId: values[SETTING_KEYS.logoMediaId],
      logoUrl: values[SETTING_KEYS.logoMediaId]
        ? urlByMediaId.get(values[SETTING_KEYS.logoMediaId]!) ?? null
        : null,
      logoAlt: values[SETTING_KEYS.logoAlt],
      faviconMediaId: values[SETTING_KEYS.faviconMediaId],
      faviconUrl: values[SETTING_KEYS.faviconMediaId]
        ? urlByMediaId.get(values[SETTING_KEYS.faviconMediaId]!) ?? null
        : null,
      ogImageMediaId: values[SETTING_KEYS.ogImageMediaId],
      ogImageUrl: values[SETTING_KEYS.ogImageMediaId]
        ? urlByMediaId.get(values[SETTING_KEYS.ogImageMediaId]!) ?? null
        : null,
    };

    return NextResponse.json(
      { success: true, data } satisfies ApiResponse<BrandingSettingsData>,
    );
  } catch (err) {
    console.error('[Settings Branding GET] Unexpected error:', err);
    return NextResponse.json(
      {
        success: false,
        error: '브랜딩 설정 조회에 실패했습니다.',
      } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request): Promise<NextResponse> {
  const { user, error } = await requirePermission('settings', 'update');
  if (error) return error;

  try {
    const body = await request.json();
    const parsed = updateBrandingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0].message,
        } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const data = parsed.data;

    // 키별 MIME 게이트 — MediaPicker SVG 우회 차단 (advisor)
    const mediaIdsToCheck: Array<
      [keyof typeof MIME_RULES, string]
    > = [];
    if (data.logoMediaId) mediaIdsToCheck.push(['logoMediaId', data.logoMediaId]);
    if (data.faviconMediaId) mediaIdsToCheck.push(['faviconMediaId', data.faviconMediaId]);
    if (data.ogImageMediaId) mediaIdsToCheck.push(['ogImageMediaId', data.ogImageMediaId]);

    if (mediaIdsToCheck.length > 0) {
      const medias = await prisma.media.findMany({
        where: { id: { in: mediaIdsToCheck.map(([, id]) => id) } },
        select: { id: true, mimeType: true },
      });
      const mimeMap = new Map(medias.map((m) => [m.id, m.mimeType]));

      for (const [field, mediaId] of mediaIdsToCheck) {
        const mime = mimeMap.get(mediaId);
        if (!mime) {
          return NextResponse.json(
            {
              success: false,
              error: '선택한 미디어를 찾을 수 없습니다.',
            } satisfies ApiResponse<never>,
            { status: 400 },
          );
        }
        const rule = MIME_RULES[field];
        if (!rule.allowed.has(mime)) {
          return NextResponse.json(
            {
              success: false,
              error: rule.label,
            } satisfies ApiResponse<never>,
            { status: 400 },
          );
        }
      }
    }

    // before snapshot — 변경된 키만 diff
    const before = await getSiteSettings(Object.values(SETTING_KEYS));

    const after: Record<string, string | null> = {
      [SETTING_KEYS.siteName]: data.siteName,
      [SETTING_KEYS.siteDescription]: data.siteDescription,
      [SETTING_KEYS.logoMediaId]: data.logoMediaId,
      [SETTING_KEYS.logoAlt]: data.logoAlt,
      [SETTING_KEYS.faviconMediaId]: data.faviconMediaId,
      [SETTING_KEYS.ogImageMediaId]: data.ogImageMediaId,
    };

    // null이면 삭제, 값이 있으면 upsert
    for (const [key, value] of Object.entries(after)) {
      if (value === null || value === '') {
        await deleteSiteSetting(key);
      } else {
        await setSiteSetting(key, value, SETTING_DESCRIPTIONS[key]);
      }
    }

    // 변경된 키만 audit changes에 포함 (advisor — 도메인 패턴 일관성, no-op short-circuit)
    const changedKeys = Object.keys(after).filter(
      (k) => (after[k] ?? '') !== (before[k] ?? ''),
    );

    if (changedKeys.length === 0) {
      return NextResponse.json(
        { success: true, data: null } satisfies ApiResponse<null>,
      );
    }

    const auditContext = getAuditContext(request);
    logAuditEvent({
      action: 'UPDATE',
      entityType: 'SITE_SETTINGS',
      entityId: 'SITE_BRANDING',
      entityTitle: '브랜딩 설정',
      changes: {
        before: Object.fromEntries(
          changedKeys.map((k) => [k, before[k] ?? '']),
        ),
        after: Object.fromEntries(
          changedKeys.map((k) => [k, after[k] ?? '']),
        ),
      },
      userId: user!.id,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
    });

    return NextResponse.json(
      { success: true, data: null } satisfies ApiResponse<null>,
    );
  } catch (err) {
    console.error('[Settings Branding PATCH] Unexpected error:', err);
    return NextResponse.json(
      {
        success: false,
        error: '브랜딩 설정 저장에 실패했습니다.',
      } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request): Promise<NextResponse> {
  const { user, error } = await requirePermission('settings', 'update');
  if (error) return error;

  try {
    const url = new URL(request.url);
    const kind = url.searchParams.get('kind') as BrandingAssetKind | null;

    if (kind !== 'logo' && kind !== 'favicon' && kind !== 'og') {
      return NextResponse.json(
        {
          success: false,
          error: 'kind 쿼리 파라미터가 필요합니다 (logo|favicon|og).',
        } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const targetKeys: string[] =
      kind === 'logo'
        ? [SETTING_KEYS.logoMediaId, SETTING_KEYS.logoAlt]
        : kind === 'favicon'
          ? [SETTING_KEYS.faviconMediaId]
          : [SETTING_KEYS.ogImageMediaId];

    const before = await getSiteSettings(targetKeys);

    for (const key of targetKeys) {
      await deleteSiteSetting(key);
    }

    const changedKeys = targetKeys.filter((k) => before[k] !== null);
    if (changedKeys.length > 0) {
      const auditContext = getAuditContext(request);
      logAuditEvent({
        action: 'UPDATE',
        entityType: 'SITE_SETTINGS',
        entityId: 'SITE_BRANDING',
        entityTitle: `브랜딩 설정 — ${kind} 제거`,
        changes: {
          before: Object.fromEntries(
            changedKeys.map((k) => [k, before[k] ?? '']),
          ),
          after: Object.fromEntries(changedKeys.map((k) => [k, ''])),
        },
        userId: user!.id,
        ipAddress: auditContext.ipAddress,
        userAgent: auditContext.userAgent,
      });
    }

    return NextResponse.json(
      { success: true, data: null } satisfies ApiResponse<null>,
    );
  } catch (err) {
    console.error('[Settings Branding DELETE] Unexpected error:', err);
    return NextResponse.json(
      {
        success: false,
        error: '브랜딩 자산 제거에 실패했습니다.',
      } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
