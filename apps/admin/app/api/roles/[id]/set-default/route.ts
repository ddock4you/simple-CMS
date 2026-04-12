import { NextResponse } from 'next/server';

import { prisma, logAuditEvent } from '@simple-cms/db';
import type { ApiResponse } from '@simple-cms/types';

import { requirePermission } from '@/entities/auth/lib/requirePermission';
import { getAuditContext } from '@/shared/lib/auditHelpers';

export async function POST(
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

    if (role.isDefault) {
      return NextResponse.json(
        { success: false, error: '이미 기본 역할입니다.' } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    await prisma.$transaction([
      prisma.role.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      }),
      prisma.role.update({
        where: { id },
        data: { isDefault: true },
      }),
    ]);

    const auditContext = getAuditContext(request);
    logAuditEvent({
      action: 'UPDATE',
      entityType: 'ROLE',
      entityId: id,
      entityTitle: role.name,
      changes: { before: { isDefault: false }, after: { isDefault: true } },
      userId: user!.id,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
    });

    return NextResponse.json(
      { success: true, data: null } satisfies ApiResponse<null>,
    );
  } catch (err) {
    console.error('[Roles Set Default] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: '기본 역할 설정에 실패했습니다.' } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
