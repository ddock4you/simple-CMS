import { NextResponse } from 'next/server';

import { prisma, logAuditEvent } from '@simple-cms/db';
import type { ApiResponse } from '@simple-cms/types';

import { requirePermission } from '@/entities/auth/lib/requirePermission';
import { getAuditContext } from '@/shared/lib/auditHelpers';
import { reorderHomePopupsSchema } from '@/features/popup-management/model/popupSchemas';

export async function PATCH(request: Request): Promise<NextResponse> {
  const { user, error } = await requirePermission('home-popups', 'update');
  if (error) return error;

  try {
    const body = await request.json();
    const parsed = reorderHomePopupsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0].message,
        } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const { popups } = parsed.data;
    if (popups.length === 0) {
      return NextResponse.json(
        { success: true, data: null } satisfies ApiResponse<null>,
      );
    }

    // 중복 id + 중복 displayOrder 검증
    const ids = new Set(popups.map((p) => p.id));
    const orders = new Set(popups.map((p) => p.displayOrder));
    if (ids.size !== popups.length || orders.size !== popups.length) {
      return NextResponse.json(
        {
          success: false,
          error: 'id와 displayOrder는 중복될 수 없습니다.',
        } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    // 모든 id가 실제 HomePopup 레코드인지 확인
    const existing = await prisma.homePopup.findMany({
      where: { id: { in: popups.map((p) => p.id) } },
      select: { id: true },
    });
    if (existing.length !== popups.length) {
      return NextResponse.json(
        {
          success: false,
          error: '존재하지 않는 팝업이 포함되어 있습니다.',
        } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    await prisma.$transaction(
      popups.map((p) =>
        prisma.homePopup.update({
          where: { id: p.id },
          data: { displayOrder: p.displayOrder },
        }),
      ),
    );

    const auditContext = getAuditContext(request);
    logAuditEvent({
      action: 'UPDATE',
      entityType: 'HOME_POPUP',
      entityTitle: '메인 팝업 순서 변경',
      changes: { after: { reorderedPopups: popups.length } },
      userId: user!.id,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
    });

    return NextResponse.json(
      { success: true, data: null } satisfies ApiResponse<null>,
    );
  } catch (err) {
    console.error('[HomePopups Reorder PATCH] Unexpected error:', err);
    return NextResponse.json(
      {
        success: false,
        error: '순서 변경에 실패했습니다.',
      } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
