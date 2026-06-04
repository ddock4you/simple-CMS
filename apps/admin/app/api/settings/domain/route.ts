import { NextResponse } from 'next/server';

import {
  getSiteSetting,
  setSiteSetting,
  deleteSiteSetting,
  logAuditEvent,
} from '@simple-cms/db';
import type { ApiResponse } from '@simple-cms/types';

import { requirePermission } from '@/entities/auth/lib/requirePermission';
import { getAuditContext } from '@/shared/lib/auditHelpers';
import { runWithUserDemoSession } from '@/shared/api/runWithUserDemoSession';
import {
  updateDomainSchema,
  type DomainSettingsData,
} from '@/features/site-settings/model/settingsSchemas';

export async function GET(_request: Request): Promise<NextResponse> {
  const { user, error } = await requirePermission('settings', 'read');
  if (error) return error;

  return runWithUserDemoSession(user, async () => {
    try {
    const domain = await getSiteSetting('SITE_DOMAIN');
    const verified = (await getSiteSetting('SITE_DOMAIN_VERIFIED')) === 'true';

    return NextResponse.json(
      { success: true, data: { domain, verified } } satisfies ApiResponse<DomainSettingsData>,
    );
    } catch (err) {
    console.error('[Settings Domain GET] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: '도메인 설정 조회에 실패했습니다.' } satisfies ApiResponse<never>,
      { status: 500 },
    );
    }
  });
}

export async function PATCH(request: Request): Promise<NextResponse> {
  const { user, error } = await requirePermission('settings', 'update');
  if (error) return error;

  try {
    const body = await request.json();
    const parsed = updateDomainSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const { domain } = parsed.data;
    const oldDomain = await getSiteSetting('SITE_DOMAIN');

    await setSiteSetting('SITE_DOMAIN', domain, '커스텀 도메인');
    await setSiteSetting('SITE_DOMAIN_VERIFIED', 'false', '도메인 DNS 검증 상태');

    const auditContext = getAuditContext(request);
    logAuditEvent({
      action: 'UPDATE',
      entityType: 'SITE_SETTINGS',
      entityId: 'SITE_DOMAIN',
      entityTitle: '도메인 설정',
      changes: {
        before: { SITE_DOMAIN: oldDomain ?? '' },
        after: { SITE_DOMAIN: domain },
      },
      userId: user!.id,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
    });

    return NextResponse.json(
      { success: true, data: null } satisfies ApiResponse<null>,
    );
  } catch (err) {
    console.error('[Settings Domain PATCH] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: '도메인 설정에 실패했습니다.' } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request): Promise<NextResponse> {
  const { user, error } = await requirePermission('settings', 'update');
  if (error) return error;

  try {
    const oldDomain = await getSiteSetting('SITE_DOMAIN');

    await deleteSiteSetting('SITE_DOMAIN');
    await deleteSiteSetting('SITE_DOMAIN_VERIFIED');

    const auditContext = getAuditContext(request);
    logAuditEvent({
      action: 'DELETE',
      entityType: 'SITE_SETTINGS',
      entityId: 'SITE_DOMAIN',
      entityTitle: '도메인 설정',
      changes: { before: { SITE_DOMAIN: oldDomain ?? '' } },
      userId: user!.id,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
    });

    return NextResponse.json(
      { success: true, data: null } satisfies ApiResponse<null>,
    );
  } catch (err) {
    console.error('[Settings Domain DELETE] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: '도메인 삭제에 실패했습니다.' } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
