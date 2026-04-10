import { NextResponse } from 'next/server';

import { prisma, logAuditEvent } from '@simple-cms/db';
import type { ApiResponse } from '@simple-cms/types';

import { getCurrentUser } from '@/entities/auth/lib/getCurrentUser';
import { getAuditContext } from '@/shared/lib/auditHelpers';
import { roleChangeSchema } from '@/features/user-management/model/userSchemas';

export async function PATCH(
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
    const body = await request.json();
    const parsed = roleChangeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const { roleId } = parsed.data;

    const targetUser = await prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: '사용자를 찾을 수 없습니다.' } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    const newRole = await prisma.role.findUnique({ where: { id: roleId } });
    if (!newRole) {
      return NextResponse.json(
        { success: false, error: '역할을 찾을 수 없습니다.' } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    if (newRole.isSystem && !currentUser.role?.isSystem) {
      return NextResponse.json(
        { success: false, error: '총괄 관리자 역할은 총괄 관리자만 배정할 수 있습니다.' } satisfies ApiResponse<never>,
        { status: 403 },
      );
    }

    if (targetUser.role?.isSystem && !newRole.isSystem) {
      const systemAdminCount = await prisma.user.count({
        where: { role: { isSystem: true }, status: 'ACTIVE' },
      });
      if (systemAdminCount <= 1) {
        return NextResponse.json(
          { success: false, error: '마지막 총괄 관리자의 역할을 변경할 수 없습니다.' } satisfies ApiResponse<never>,
          { status: 400 },
        );
      }
    }

    await prisma.user.update({
      where: { id },
      data: { roleId },
    });

    const auditContext = getAuditContext(request);
    logAuditEvent({
      action: 'UPDATE',
      entityType: 'USER',
      entityId: id,
      entityTitle: targetUser.username,
      changes: {
        before: { roleId: targetUser.roleId, roleName: targetUser.role?.name ?? null },
        after: { roleId, roleName: newRole.name },
      },
      userId: currentUser.id,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
    });

    return NextResponse.json(
      { success: true, data: null } satisfies ApiResponse<null>,
    );
  } catch (error) {
    console.error('[Role Change API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: '역할 변경에 실패했습니다.' } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
