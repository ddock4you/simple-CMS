import { NextResponse } from 'next/server';

import { getSiteSetting, setSiteSetting, logAuditEvent } from '@simple-cms/db';
import { SITE_SETTING_KEYS } from '@simple-cms/types';
import type { ApiResponse } from '@simple-cms/types';

import { requirePermission } from '@/entities/auth/lib/requirePermission';
import { getAuditContext } from '@/shared/lib/auditHelpers';
import {
  updateSeoSchema,
  type SeoSettingsData,
} from '@/features/site-settings/model/settingsSchemas';

const ROBOTS_ADDITIONAL_DISALLOW_KEY = SITE_SETTING_KEYS.ROBOTS_ADDITIONAL_DISALLOW;

function getBaseUrl(domain: string | null): string {
  if (domain) return `https://${domain}`;
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
}

function parseRobotsDisallow(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p): p is string => typeof p === 'string' && p.trim().length > 0,
    );
  } catch {
    return [];
  }
}

export async function GET(_request: Request): Promise<NextResponse> {
  const { error } = await requirePermission('settings', 'read');
  if (error) return error;

  try {
    const [robotsRaw, domain] = await Promise.all([
      getSiteSetting(ROBOTS_ADDITIONAL_DISALLOW_KEY),
      getSiteSetting('SITE_DOMAIN'),
    ]);

    const robotsAdditionalDisallow = parseRobotsDisallow(robotsRaw);
    const baseUrl = getBaseUrl(domain);
    const sitemapUrl = `${baseUrl}/sitemap.xml`;

    return NextResponse.json(
      {
        success: true,
        data: { robotsAdditionalDisallow, baseUrl, sitemapUrl },
      } satisfies ApiResponse<SeoSettingsData>,
    );
  } catch (err) {
    console.error('[Settings SEO GET] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: 'SEO 설정 조회에 실패했습니다.' } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request): Promise<NextResponse> {
  const { user, error } = await requirePermission('settings', 'update');
  if (error) return error;

  try {
    const body: unknown = await request.json();
    const parsed = updateSeoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    // dedupe + 기본 Disallow(`/api/`) 중복 제거 (robots.ts에서 자동 병합하지만 저장 값도 깔끔하게 유지)
    const cleaned = Array.from(
      new Set(parsed.data.robotsAdditionalDisallow.map((p) => p.trim())),
    ).filter((p) => p !== '/api/' && p !== '/api');

    const oldRaw = await getSiteSetting(ROBOTS_ADDITIONAL_DISALLOW_KEY);
    const oldValue = parseRobotsDisallow(oldRaw);

    const oldSorted = [...oldValue].sort();
    const newSorted = [...cleaned].sort();
    const changed =
      oldSorted.length !== newSorted.length ||
      oldSorted.some((v, i) => v !== newSorted[i]);

    if (!changed) {
      return NextResponse.json(
        { success: true, data: null } satisfies ApiResponse<null>,
      );
    }

    await setSiteSetting(
      ROBOTS_ADDITIONAL_DISALLOW_KEY,
      JSON.stringify(cleaned),
      'robots.txt 추가 Disallow 경로 (JSON array)',
    );

    const auditContext = getAuditContext(request);
    logAuditEvent({
      action: 'UPDATE',
      entityType: 'SITE_SETTINGS',
      entityId: ROBOTS_ADDITIONAL_DISALLOW_KEY,
      entityTitle: 'SEO 설정 (robots.txt)',
      changes: {
        before: { ROBOTS_ADDITIONAL_DISALLOW: oldValue },
        after: { ROBOTS_ADDITIONAL_DISALLOW: cleaned },
      },
      userId: user!.id,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
    });

    return NextResponse.json(
      { success: true, data: null } satisfies ApiResponse<null>,
    );
  } catch (err) {
    console.error('[Settings SEO PATCH] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: 'SEO 설정 변경에 실패했습니다.' } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
