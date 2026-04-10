import { NextResponse } from 'next/server';

import { prisma, logAuditEvent } from '@simple-cms/db';
import type { ApiResponse } from '@simple-cms/types';

import { requirePermission } from '@/entities/auth/lib/requirePermission';
import { getAuditContext } from '@/shared/lib/auditHelpers';
import { createRoleSchema } from '@/features/role-management/model/roleSchemas';

export async function GET(): Promise<NextResponse> {
  const { user, error } = await requirePermission('roles', 'read');
  if (error) return error;

  try {
    const roles = await prisma.role.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        isSystem: true,
        isDefault: true,
        _count: { select: { users: true } },
      },
      orderBy: [{ isSystem: 'desc' }, { isDefault: 'desc' }, { name: 'asc' }],
    });

    const data = roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      isDefault: role.isDefault,
      userCount: role._count.users,
    }));

    return NextResponse.json(
      { success: true, data } satisfies ApiResponse<typeof data>,
    );
  } catch (err) {
    console.error('[Roles GET] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: '역할 목록 조회에 실패했습니다.' } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const { user, error } = await requirePermission('roles', 'create');
  if (error) return error;

  try {
    const body = await request.json();
    const parsed = createRoleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const { name, description, permissions } = parsed.data;

    const existing = await prisma.role.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: '이미 사용 중인 역할명입니다.' } satisfies ApiResponse<never>,
        { status: 409 },
      );
    }

    const newRole = await prisma.role.create({
      data: { name, description, permissions },
    });

    const auditContext = getAuditContext(request);
    logAuditEvent({
      action: 'CREATE',
      entityType: 'ROLE',
      entityId: newRole.id,
      entityTitle: name,
      changes: { after: { name, description, permissions } },
      userId: user!.id,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
    });

    return NextResponse.json(
      { success: true, data: newRole } satisfies ApiResponse<typeof newRole>,
      { status: 201 },
    );
  } catch (err) {
    console.error('[Roles POST] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: '역할 생성에 실패했습니다.' } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
