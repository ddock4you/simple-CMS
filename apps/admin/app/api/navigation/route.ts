import { NextResponse } from 'next/server';

import { prisma, logAuditEvent } from '@simple-cms/db';
import type { ApiResponse } from '@simple-cms/types';

import { requirePermission } from '@/entities/auth/lib/requirePermission';
import { getAuditContext } from '@/shared/lib/auditHelpers';
import { runWithUserDemoSession } from '@/shared/api/runWithUserDemoSession';
import { createMenuSchema } from '@/features/navigation-management/model/navigationSchemas';
import type { MenuSetListItem } from '@/features/navigation-management/model/navigationFilters';

export async function GET(_request: Request): Promise<NextResponse> {
  const { user, error } = await requirePermission('navigation', 'read');
  if (error) return error;

  return runWithUserDemoSession(user, async () => {
    try {
    const menus = await prisma.navigationMenu.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        slots: true,
        updatedAt: true,
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const data: MenuSetListItem[] = menus.map((menu) => ({
      id: menu.id,
      name: menu.name,
      description: menu.description,
      slots: menu.slots,
      itemCount: menu._count.items,
      updatedAt: menu.updatedAt.toISOString(),
    }));

    return NextResponse.json(
      { success: true, data } satisfies ApiResponse<MenuSetListItem[]>,
    );
    } catch (err) {
    console.error('[Navigation GET] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: '메뉴 목록 조회에 실패했습니다.' } satisfies ApiResponse<never>,
      { status: 500 },
    );
    }
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  const { user, error } = await requirePermission('navigation', 'create');
  if (error) return error;

  return runWithUserDemoSession(user, async () => {
  try {
    const body = await request.json();
    const parsed = createMenuSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const { name, description, slots } = parsed.data;

    const existing = await prisma.navigationMenu.findFirst({ where: { name } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: '이미 사용 중인 메뉴 이름입니다.' } satisfies ApiResponse<never>,
        { status: 409 },
      );
    }

    // Slot uniqueness check: each slot can only be assigned to one menu
    if (slots && slots.length > 0) {
      for (const slot of slots) {
        const slotInUse = await prisma.navigationMenu.findFirst({
          where: { slots: { has: slot } },
          select: { id: true, name: true },
        });
        if (slotInUse) {
          return NextResponse.json(
            { success: false, error: `${slot} 슬롯은 이미 "${slotInUse.name}" 메뉴에 배정되어 있습니다.` } satisfies ApiResponse<never>,
            { status: 409 },
          );
        }
      }
    }

    const menu = await prisma.navigationMenu.create({
      data: { name, description, slots: slots ?? [] },
    });

    const auditContext = getAuditContext(request);
    logAuditEvent({
      action: 'CREATE',
      entityType: 'NAVIGATION_MENU',
      entityId: menu.id,
      entityTitle: name,
      changes: { after: { name, slots: slots ?? [] } },
      userId: user!.id,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
    });

    return NextResponse.json(
      { success: true, data: { id: menu.id } } satisfies ApiResponse<{ id: string }>,
      { status: 201 },
    );
  } catch (err) {
    console.error('[Navigation POST] Unexpected error:', err);
    const message = err instanceof Error ? err.message : '메뉴 생성에 실패했습니다.';
    return NextResponse.json(
      { success: false, error: message } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
  });
}
