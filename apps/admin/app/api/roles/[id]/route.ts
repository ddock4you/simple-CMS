import { NextResponse } from 'next/server';

import { prisma, logAuditEvent } from '@simple-cms/db';
import type { ApiResponse } from '@simple-cms/types';

import { requirePermission } from '@/entities/auth/lib/requirePermission';
import { getAuditContext } from '@/shared/lib/auditHelpers';
import { runWithUserDemoSession } from '@/shared/api/runWithUserDemoSession';
import { updateRoleSchema } from '@/features/role-management/model/roleSchemas';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { user, error } = await requirePermission('roles', 'read');
  if (error) return error;

  return runWithUserDemoSession(user, async () => {
    try {
    const { id } = await params;
    const role = await prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });

    if (!role) {
      return NextResponse.json(
        { success: false, error: '역할을 찾을 수 없습니다.' } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    const data = {
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.permissions,
      isSystem: role.isSystem,
      isDefault: role.isDefault,
      userCount: role._count.users,
      createdAt: role.createdAt.toISOString(),
      updatedAt: role.updatedAt.toISOString(),
    };

    return NextResponse.json(
      { success: true, data } satisfies ApiResponse<typeof data>,
    );
    } catch (err) {
    console.error('[Roles GET detail] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: '역할 조회에 실패했습니다.' } satisfies ApiResponse<never>,
      { status: 500 },
    );
    }
  });
}

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

    const body = await request.json();
    const parsed = updateRoleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const { name, description } = parsed.data;

    if (name && name !== role.name) {
      const existing = await prisma.role.findFirst({ where: { name } });
      if (existing) {
        return NextResponse.json(
          { success: false, error: '이미 사용 중인 역할명입니다.' } satisfies ApiResponse<never>,
          { status: 409 },
        );
      }
    }

    const updated = await prisma.role.update({
      where: { id },
      data: { ...(name && { name }), ...(description !== undefined && { description }) },
    });

    const before: Record<string, string | null> = {};
    const after: Record<string, string | null> = {};
    if (name && name !== role.name) {
      before.name = role.name;
      after.name = name;
    }
    if (description !== undefined && description !== role.description) {
      before.description = role.description;
      after.description = description ?? null;
    }

    if (Object.keys(after).length > 0) {
      const auditContext = getAuditContext(request);
      logAuditEvent({
        action: 'UPDATE',
        entityType: 'ROLE',
        entityId: id,
        entityTitle: updated.name,
        changes: { before, after },
        userId: user!.id,
        ipAddress: auditContext.ipAddress,
        userAgent: auditContext.userAgent,
      });
    }

    return NextResponse.json(
      { success: true, data: null } satisfies ApiResponse<null>,
    );
  } catch (err) {
    console.error('[Roles PATCH] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: '역할 수정에 실패했습니다.' } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { user, error } = await requirePermission('roles', 'delete');
  if (error) return error;

  try {
    const { id } = await params;
    const role = await prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });

    if (!role) {
      return NextResponse.json(
        { success: false, error: '역할을 찾을 수 없습니다.' } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    if (role.isSystem) {
      return NextResponse.json(
        { success: false, error: '시스템 역할은 삭제할 수 없습니다.' } satisfies ApiResponse<never>,
        { status: 403 },
      );
    }

    if (role.isDefault) {
      return NextResponse.json(
        { success: false, error: '기본 역할은 다른 역할을 기본으로 설정한 후 삭제할 수 있습니다.' } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    await prisma.role.delete({ where: { id } });

    const auditContext = getAuditContext(request);
    logAuditEvent({
      action: 'DELETE',
      entityType: 'ROLE',
      entityId: id,
      entityTitle: role.name,
      changes: { before: { name: role.name, description: role.description } },
      userId: user!.id,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
    });

    return NextResponse.json(
      { success: true, data: null } satisfies ApiResponse<null>,
    );
  } catch (err) {
    console.error('[Roles DELETE] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: '역할 삭제에 실패했습니다.' } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
