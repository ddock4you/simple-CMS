import { NextResponse } from 'next/server';

import { prisma, logAuditEvent, deleteUserSessions } from '@simple-cms/db';
import type { ApiResponse } from '@simple-cms/types';

import { getCurrentUser } from '@/entities/auth/lib/getCurrentUser';
import { getAuditContext } from '@/shared/lib/auditHelpers';

export async function POST(
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

    if (id === currentUser.id) {
      return NextResponse.json(
        { success: false, error: '자기 자신을 정지할 수 없습니다.' } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: '사용자를 찾을 수 없습니다.' } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    if (targetUser.status !== 'ACTIVE') {
      return NextResponse.json(
        { success: false, error: '활성 상태의 사용자만 정지할 수 있습니다.' } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const activeCount = await prisma.user.count({ where: { status: 'ACTIVE' } });
    if (activeCount <= 1) {
      return NextResponse.json(
        { success: false, error: '마지막 활성 관리자는 정지할 수 없습니다.' } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    await prisma.user.update({
      where: { id },
      data: { status: 'SUSPENDED' },
    });

    await deleteUserSessions(id);

    const auditContext = getAuditContext(request);
    logAuditEvent({
      action: 'UPDATE',
      entityType: 'USER',
      entityId: id,
      entityTitle: targetUser.username,
      changes: {
        before: { status: 'ACTIVE' },
        after: { status: 'SUSPENDED' },
      },
      userId: currentUser.id,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
    });

    return NextResponse.json(
      { success: true, data: null } satisfies ApiResponse<null>,
    );
  } catch (error) {
    console.error('[Suspend API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: '정지 처리에 실패했습니다.' } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
