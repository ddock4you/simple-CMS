import { NextResponse } from 'next/server';

import { prisma, logAuditEvent } from '@simple-cms/db';
import type { ApiResponse } from '@simple-cms/types';

import { getCurrentUser } from '@/entities/auth/lib/getCurrentUser';
import { getAuditContext } from '@/shared/lib/auditHelpers';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다.' } satisfies ApiResponse<never>,
        { status: 401 },
      );
    }

    const { id } = await params;

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: '사용자를 찾을 수 없습니다.' } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    if (targetUser.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, error: '대기 상태의 사용자만 거절할 수 있습니다.' } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    await prisma.user.delete({ where: { id } });

    const auditContext = getAuditContext(request);
    logAuditEvent({
      action: 'DELETE',
      entityType: 'USER',
      entityId: id,
      entityTitle: targetUser.username,
      changes: {
        before: { username: targetUser.username, name: targetUser.name, status: 'PENDING' },
      },
      userId: currentUser.id,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
    });

    return NextResponse.json(
      { success: true, data: null } satisfies ApiResponse<null>,
    );
  } catch (error) {
    console.error('[Reject API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: '거절 처리에 실패했습니다.' } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
