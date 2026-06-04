import { NextResponse } from 'next/server';

import { setSiteSetting, logAuditEvent, getUploadRestrictions } from '@simple-cms/db';
import { SITE_SETTING_KEYS } from '@simple-cms/types';
import type { ApiResponse } from '@simple-cms/types';

import { requirePermission } from '@/entities/auth/lib/requirePermission';
import { getAuditContext } from '@/shared/lib/auditHelpers';
import { runWithUserDemoSession } from '@/shared/api/runWithUserDemoSession';
import {
  updateUploadSchema,
  type UploadSettingsData,
} from '@/features/site-settings/model/settingsSchemas';

export async function GET(_request: Request): Promise<NextResponse> {
  const { user, error } = await requirePermission('settings', 'read');
  if (error) return error;

  return runWithUserDemoSession(user, async () => {
    try {
    const restrictions = await getUploadRestrictions();

    return NextResponse.json(
      { success: true, data: restrictions } satisfies ApiResponse<UploadSettingsData>,
    );
    } catch (err) {
    console.error('[Settings Upload GET] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: '업로드 설정 조회에 실패했습니다.' } satisfies ApiResponse<never>,
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
    const parsed = updateUploadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const { allowedExtensions, allowedMimeTypes, maxFileSizeMb } = parsed.data;
    const oldRestrictions = await getUploadRestrictions();

    await setSiteSetting(
      SITE_SETTING_KEYS.UPLOAD_ALLOWED_EXTENSIONS,
      JSON.stringify(allowedExtensions),
      '허용 파일 확장자',
    );
    await setSiteSetting(
      SITE_SETTING_KEYS.UPLOAD_ALLOWED_MIME_TYPES,
      JSON.stringify(allowedMimeTypes),
      '허용 MIME 타입',
    );
    await setSiteSetting(
      SITE_SETTING_KEYS.UPLOAD_MAX_FILE_SIZE_MB,
      String(maxFileSizeMb),
      '최대 파일 크기 (MB)',
    );

    const auditContext = getAuditContext(request);
    logAuditEvent({
      action: 'UPDATE',
      entityType: 'SITE_SETTINGS',
      entityId: 'UPLOAD_SETTINGS',
      entityTitle: '업로드 제한 설정',
      changes: {
        before: {
          extensions: JSON.stringify(oldRestrictions.allowedExtensions),
          maxFileSizeMb: String(oldRestrictions.maxFileSizeMb),
        },
        after: {
          extensions: JSON.stringify(allowedExtensions),
          maxFileSizeMb: String(maxFileSizeMb),
        },
      },
      userId: user!.id,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
    });

    return NextResponse.json(
      { success: true, data: null } satisfies ApiResponse<null>,
    );
  } catch (err) {
    console.error('[Settings Upload PATCH] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: '업로드 설정 변경에 실패했습니다.' } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
