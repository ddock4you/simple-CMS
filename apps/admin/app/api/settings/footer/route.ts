import { NextResponse } from 'next/server';

import {
  getSiteSetting,
  logAuditEvent,
  prisma,
  setSiteSetting,
} from '@simple-cms/db';
import type { Prisma } from '@simple-cms/db';
import {
  DEFAULT_SITE_FOOTER_CONFIG,
  SITE_SETTING_KEYS,
  type ApiResponse,
  type SiteFooterConfig,
} from '@simple-cms/types';

import { requirePermission } from '@/entities/auth/lib/requirePermission';
import { getAuditContext } from '@/shared/lib/auditHelpers';
import {
  updateFooterSchema,
  type FooterSettingsData,
  type UpdateFooterData,
} from '@/features/site-settings/model/settingsSchemas';

const FOOTER_CONFIG_KEY = SITE_SETTING_KEYS.SITE_FOOTER_CONFIG;
const FOOTER_LOGO_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

function parseFooterConfig(raw: string | null): SiteFooterConfig {
  if (!raw) return DEFAULT_SITE_FOOTER_CONFIG;
  try {
    const parsed: unknown = JSON.parse(raw);
    const result = updateFooterSchema.safeParse(parsed);
    return result.success
      ? normalizeFooterConfig(result.data)
      : DEFAULT_SITE_FOOTER_CONFIG;
  } catch {
    return DEFAULT_SITE_FOOTER_CONFIG;
  }
}

function nullableTrim(value: string | null): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeFooterConfig(data: UpdateFooterData): SiteFooterConfig {
  return {
    footerLogoMediaId: data.footerLogoMediaId,
    footerLogoAlt: nullableTrim(data.footerLogoAlt),
    address: nullableTrim(data.address),
    contacts: data.contacts.map((item) => ({
      title: item.title.trim(),
      description: item.description.trim(),
    })),
    quickLinks: data.quickLinks.map((item) => ({
      title: item.title.trim(),
      url: item.url.trim(),
      openInNewTab: item.openInNewTab ?? false,
    })),
    socialLinks: data.socialLinks.map((item) => ({
      platform: item.platform,
      href: item.href.trim(),
      openInNewTab: item.openInNewTab ?? false,
    })),
    bottomLinks: data.bottomLinks.map((item) => ({
      text: item.text.trim(),
      href: item.href.trim(),
      openInNewTab: item.openInNewTab ?? false,
      isHighlighted: item.isHighlighted ?? false,
    })),
    identifierText: nullableTrim(data.identifierText),
    copyright: nullableTrim(data.copyright),
    hideQuickLinks: data.hideQuickLinks,
    hideIdentifier: data.hideIdentifier,
  };
}

export async function GET(_request: Request): Promise<NextResponse> {
  const { error } = await requirePermission('settings', 'read');
  if (error) return error;

  try {
    const raw = await getSiteSetting(FOOTER_CONFIG_KEY);
    const config = parseFooterConfig(raw);
    const footerLogo = config.footerLogoMediaId
      ? await prisma.media.findUnique({
          where: { id: config.footerLogoMediaId },
          select: { url: true },
        })
      : null;
    const data: FooterSettingsData = {
      ...config,
      footerLogoUrl: footerLogo?.url ?? null,
    };

    return NextResponse.json({
      success: true,
      data,
    } satisfies ApiResponse<FooterSettingsData>);
  } catch (err) {
    console.error('[Settings Footer GET] Unexpected error:', err);
    return NextResponse.json(
      {
        success: false,
        error: '푸터 설정 조회에 실패했습니다.',
      } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request): Promise<NextResponse> {
  const { user, error } = await requirePermission('settings', 'update');
  if (error) return error;

  try {
    const body: unknown = await request.json();
    const parsed = updateFooterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0].message,
        } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const oldRaw = await getSiteSetting(FOOTER_CONFIG_KEY);
    const oldValue = parseFooterConfig(oldRaw);
    const nextValue = normalizeFooterConfig(parsed.data);

    if (nextValue.footerLogoMediaId) {
      const media = await prisma.media.findUnique({
        where: { id: nextValue.footerLogoMediaId },
        select: { mimeType: true },
      });

      if (!media) {
        return NextResponse.json(
          {
            success: false,
            error: '선택한 푸터 로고 미디어를 찾을 수 없습니다.',
          } satisfies ApiResponse<never>,
          { status: 400 },
        );
      }

      if (!FOOTER_LOGO_MIME.has(media.mimeType)) {
        return NextResponse.json(
          {
            success: false,
            error: '푸터 로고는 PNG, JPG, WEBP만 사용할 수 있습니다.',
          } satisfies ApiResponse<never>,
          { status: 400 },
        );
      }
    }

    if (JSON.stringify(oldValue) === JSON.stringify(nextValue)) {
      return NextResponse.json({
        success: true,
        data: null,
      } satisfies ApiResponse<null>);
    }

    await setSiteSetting(
      FOOTER_CONFIG_KEY,
      JSON.stringify(nextValue),
      '공개 웹 푸터 설정 (JSON)',
    );

    const auditContext = getAuditContext(request);
    const auditChanges = JSON.parse(
      JSON.stringify({ before: oldValue, after: nextValue }),
    ) as Prisma.InputJsonValue;

    logAuditEvent({
      action: 'UPDATE',
      entityType: 'SITE_SETTINGS',
      entityId: FOOTER_CONFIG_KEY,
      entityTitle: '푸터 설정',
      changes: auditChanges,
      userId: user!.id,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
    });

    return NextResponse.json({
      success: true,
      data: null,
    } satisfies ApiResponse<null>);
  } catch (err) {
    console.error('[Settings Footer PATCH] Unexpected error:', err);
    return NextResponse.json(
      {
        success: false,
        error: '푸터 설정 변경에 실패했습니다.',
      } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
