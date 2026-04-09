import { NextResponse } from 'next/server';

import { prisma, logAuditEvent } from '@simple-cms/db';
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

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: '사용자를 찾을 수 없습니다.' } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    if (targetUser.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, error: '대기 상태의 사용자만 승인할 수 있습니다.' } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const defaultRole = await prisma.role.findFirst({
      where: { isDefault: true },
    });
    if (!defaultRole) {
      return NextResponse.json(
        { success: false, error: '기본 역할이 설정되지 않아 승인할 수 없습니다.' } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    await prisma.user.update({
      where: { id },
      data: { status: 'ACTIVE', roleId: defaultRole.id },
    });

    const auditContext = getAuditContext(request);
    logAuditEvent({
      action: 'UPDATE',
      entityType: 'USER',
      entityId: id,
      entityTitle: targetUser.username,
      changes: {
        before: { status: 'PENDING', roleId: null },
        after: { status: 'ACTIVE', roleId: defaultRole.id, roleName: defaultRole.name },
      },
      userId: currentUser.id,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
    });

    return NextResponse.json(
      { success: true, data: null } satisfies ApiResponse<null>,
    );
  } catch (error) {
    console.error('[Approve API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: '승인 처리에 실패했습니다.' } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
