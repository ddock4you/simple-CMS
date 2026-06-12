import { NextResponse } from 'next/server';

import { getSiteSetting, setSiteSetting, logAuditEvent } from '@simple-cms/db';
import { SITE_SETTING_KEYS } from '@simple-cms/types';
import type { ApiResponse } from '@simple-cms/types';

import { requirePermission } from '@/entities/auth/lib/requirePermission';
import { getAuditContext } from '@/shared/lib/auditHelpers';
import { runWithUserDemoSession } from '@/entities/auth/lib/runWithUserDemoSession';
import {
  updateSecuritySchema,
  type SecuritySettingsData,
} from '@/features/site-settings/model/settingsSchemas';

export async function GET(_request: Request): Promise<NextResponse> {
  const { user, error } = await requirePermission('settings', 'read');
  if (error) return error;

  return runWithUserDemoSession(user, async () => {
    try {
    const value = await getSiteSetting(SITE_SETTING_KEYS.CONCURRENT_LOGIN_ENABLED);
    const concurrentLoginEnabled = value !== 'false';

    return NextResponse.json(
      { success: true, data: { concurrentLoginEnabled } } satisfies ApiResponse<SecuritySettingsData>,
    );
    } catch (err) {
    console.error('[Settings Security GET] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: '보안 설정 조회에 실패했습니다.' } satisfies ApiResponse<never>,
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
    const parsed = updateSecuritySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const { concurrentLoginEnabled } = parsed.data;
    const oldValue = await getSiteSetting(SITE_SETTING_KEYS.CONCURRENT_LOGIN_ENABLED);

    await setSiteSetting(
      SITE_SETTING_KEYS.CONCURRENT_LOGIN_ENABLED,
      String(concurrentLoginEnabled),
      '동시 로그인 허용 여부',
    );

    const auditContext = getAuditContext(request);
    logAuditEvent({
      action: 'UPDATE',
      entityType: 'SITE_SETTINGS',
      entityId: SITE_SETTING_KEYS.CONCURRENT_LOGIN_ENABLED,
      entityTitle: '동시 로그인 설정',
      changes: {
        before: { CONCURRENT_LOGIN_ENABLED: oldValue ?? 'true' },
        after: { CONCURRENT_LOGIN_ENABLED: String(concurrentLoginEnabled) },
      },
      userId: user!.id,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
    });

    return NextResponse.json(
      { success: true, data: null } satisfies ApiResponse<null>,
    );
  } catch (err) {
    console.error('[Settings Security PATCH] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: '보안 설정 변경에 실패했습니다.' } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
