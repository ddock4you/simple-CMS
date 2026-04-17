import { NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma, logAuditEvent } from '@simple-cms/db';
import type { ApiResponse } from '@simple-cms/types';

import { requirePermission } from '@/entities/auth/lib/requirePermission';
import { getAuditContext } from '@/shared/lib/auditHelpers';

const visibilitySchema = z.object({
  isVisible: z.boolean(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { user, error } = await requirePermission('home-popups', 'update');
  if (error) return error;

  try {
    const { id } = await params;
    const popup = await prisma.homePopup.findUnique({ where: { id } });
    if (!popup) {
      return NextResponse.json(
        { success: false, error: '팝업을 찾을 수 없습니다.' } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    const body = await request.json();
    const parsed = visibilitySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const { isVisible } = parsed.data;
    if (isVisible === popup.isVisible) {
      return NextResponse.json(
        { success: true, data: null } satisfies ApiResponse<null>,
      );
    }

    const updated = await prisma.homePopup.update({
      where: { id },
      data: { isVisible },
    });

    const auditContext = getAuditContext(request);
    logAuditEvent({
      action: 'UPDATE',
      entityType: 'HOME_POPUP',
      entityId: id,
      entityTitle: `${updated.title} (공개 변경)`,
      changes: {
        before: { isVisible: String(popup.isVisible) },
        after: { isVisible: String(isVisible) },
      },
      userId: user!.id,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
    });

    return NextResponse.json(
      { success: true, data: null } satisfies ApiResponse<null>,
    );
  } catch (err) {
    console.error('[HomePopups PATCH visibility] Unexpected error:', err);
    const message =
      err instanceof Error ? err.message : '공개 상태 변경에 실패했습니다.';
    return NextResponse.json(
      { success: false, error: message } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
