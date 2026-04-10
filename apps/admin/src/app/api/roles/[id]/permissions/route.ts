import { NextResponse } from 'next/server';

import { prisma, logAuditEvent } from '@simple-cms/db';
import type { ApiResponse } from '@simple-cms/types';

import { requirePermission } from '@/entities/auth/lib/requirePermission';
import { getAuditContext } from '@/shared/lib/auditHelpers';
import { updatePermissionsSchema } from '@/features/role-management/model/roleSchemas';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { user, error } = await requirePermission('roles', 'update');
  if (error) return error;

  try {
    const { id } = await params;
    const role = await prisma.role.findUnique({ where: { id } });

    if (!role) {
      return NextResponse.json(
        { success: false, error: '역할을 찾을 수 없습니다.' } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    if (role.isSystem) {
      return NextResponse.json(
        { success: false, error: '시스템 역할의 권한은 수정할 수 없습니다.' } satisfies ApiResponse<never>,
        { status: 403 },
      );
    }

    const body = await request.json();
    const parsed = updatePermissionsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const { permissions } = parsed.data;

    await prisma.role.update({
      where: { id },
      data: { permissions },
    });

    const auditContext = getAuditContext(request);
    logAuditEvent({
      action: 'UPDATE',
      entityType: 'ROLE',
      entityId: id,
      entityTitle: role.name,
      changes: { before: { permissions: role.permissions }, after: { permissions } },
      userId: user!.id,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
    });

    return NextResponse.json(
      { success: true, data: null } satisfies ApiResponse<null>,
    );
  } catch (err) {
    console.error('[Roles Permissions PATCH] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: '권한 변경에 실패했습니다.' } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
