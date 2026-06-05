import { NextResponse } from 'next/server';

import { prisma, logAuditEvent } from '@simple-cms/db';
import type { ApiResponse } from '@simple-cms/types';

import { requirePermission } from '@/entities/auth/lib/requirePermission';
import { getAuditContext } from '@/shared/lib/auditHelpers';
import { runWithUserDemoSession } from '@/shared/api/runWithUserDemoSession';
import { updateMenuSchema } from '@/features/navigation-management/model/navigationSchemas';
import type { MenuSetDetail, MenuItemNode } from '@/features/navigation-management/model/navigationFilters';

function buildTree(
  items: Array<{
    id: string;
    parentId: string | null;
    label: string;
    itemType: string;
    subpageId: string | null;
    boardId: string | null;
    url: string | null;
    isVisible: boolean;
    openInNewTab: boolean;
    displayOrder: number;
    startDate: Date | null;
    endDate: Date | null;
    subpage: { title: string } | null;
    board: { name: string } | null;
  }>,
): MenuItemNode[] {
  const map = new Map<string, MenuItemNode>();
  const roots: MenuItemNode[] = [];

  for (const item of items) {
    map.set(item.id, {
      id: item.id,
      label: item.label,
      itemType: item.itemType as MenuItemNode['itemType'],
      subpageId: item.subpageId,
      boardId: item.boardId,
      url: item.url,
      isVisible: item.isVisible,
      openInNewTab: item.openInNewTab,
      displayOrder: item.displayOrder,
      startDate: item.startDate?.toISOString() ?? null,
      endDate: item.endDate?.toISOString() ?? null,
      children: [],
      subpageName: item.subpage?.title ?? null,
      boardName: item.board?.name ?? null,
    });
  }

  for (const item of items) {
    const node = map.get(item.id)!;
    if (item.parentId && map.has(item.parentId)) {
      map.get(item.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Sort children by displayOrder
  for (const node of map.values()) {
    node.children.sort((a, b) => a.displayOrder - b.displayOrder);
  }
  roots.sort((a, b) => a.displayOrder - b.displayOrder);

  return roots;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ menuId: string }> },
): Promise<NextResponse> {
  const { user, error } = await requirePermission('navigation', 'read');
  if (error) return error;

  return runWithUserDemoSession(user, async () => {
    try {
    const { menuId } = await params;
    const menu = await prisma.navigationMenu.findUnique({
      where: { id: menuId },
      include: {
        items: {
          select: {
            id: true,
            parentId: true,
            label: true,
            itemType: true,
            subpageId: true,
            boardId: true,
            url: true,
            isVisible: true,
            openInNewTab: true,
            displayOrder: true,
            startDate: true,
            endDate: true,
            subpage: { select: { title: true } },
            board: { select: { name: true } },
          },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    if (!menu) {
      return NextResponse.json(
        { success: false, error: '메뉴를 찾을 수 없습니다.' } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    const data: MenuSetDetail = {
      id: menu.id,
      name: menu.name,
      description: menu.description,
      slots: menu.slots,
      items: buildTree(menu.items),
      createdAt: menu.createdAt.toISOString(),
      updatedAt: menu.updatedAt.toISOString(),
    };

    return NextResponse.json(
      { success: true, data } satisfies ApiResponse<MenuSetDetail>,
    );
    } catch (err) {
    console.error('[Navigation GET detail] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: '메뉴 조회에 실패했습니다.' } satisfies ApiResponse<never>,
      { status: 500 },
    );
    }
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ menuId: string }> },
): Promise<NextResponse> {
  const { user, error } = await requirePermission('navigation', 'update');
  if (error) return error;

  return runWithUserDemoSession(user, async () => {
  try {
    const { menuId } = await params;
    const menu = await prisma.navigationMenu.findUnique({ where: { id: menuId } });
    if (!menu) {
      return NextResponse.json(
        { success: false, error: '메뉴를 찾을 수 없습니다.' } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    const body = await request.json();
    const parsed = updateMenuSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const { name, description, slots } = parsed.data;

    if (name && name !== menu.name) {
      const existing = await prisma.navigationMenu.findFirst({ where: { name } });
      if (existing) {
        return NextResponse.json(
          { success: false, error: '이미 사용 중인 메뉴 이름입니다.' } satisfies ApiResponse<never>,
          { status: 409 },
        );
      }
    }

    // Slot uniqueness check: each slot can only be assigned to one menu
    if (slots !== undefined) {
      // Check only newly added slots (not already on this menu)
      const newSlots = slots.filter((s) => !menu.slots.includes(s));
      for (const slot of newSlots) {
        const slotInUse = await prisma.navigationMenu.findFirst({
          where: { slots: { has: slot }, id: { not: menuId } },
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

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (slots !== undefined) updateData.slots = slots;

    const updated = await prisma.navigationMenu.update({
      where: { id: menuId },
      data: updateData,
    });

    const before: Record<string, string | string[] | null> = {};
    const after: Record<string, string | string[] | null> = {};
    if (name !== undefined && name !== menu.name) {
      before.name = menu.name;
      after.name = name;
    }
    if (description !== undefined && description !== menu.description) {
      before.description = menu.description;
      after.description = description ?? '';
    }
    if (slots !== undefined && JSON.stringify(slots) !== JSON.stringify(menu.slots)) {
      before.slots = menu.slots;
      after.slots = slots;
    }

    if (Object.keys(after).length > 0) {
      const auditContext = getAuditContext(request);
      logAuditEvent({
        action: 'UPDATE',
        entityType: 'NAVIGATION_MENU',
        entityId: menuId,
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
    console.error('[Navigation PATCH] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: '메뉴 수정에 실패했습니다.' } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ menuId: string }> },
): Promise<NextResponse> {
  const { user, error } = await requirePermission('navigation', 'delete');
  if (error) return error;

  return runWithUserDemoSession(user, async () => {
  try {
    const { menuId } = await params;
    const menu = await prisma.navigationMenu.findUnique({ where: { id: menuId } });
    if (!menu) {
      return NextResponse.json(
        { success: false, error: '메뉴를 찾을 수 없습니다.' } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    await prisma.navigationMenu.delete({ where: { id: menuId } });

    const auditContext = getAuditContext(request);
    logAuditEvent({
      action: 'DELETE',
      entityType: 'NAVIGATION_MENU',
      entityId: menuId,
      entityTitle: menu.name,
      changes: { before: { name: menu.name } },
      userId: user!.id,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
    });

    return NextResponse.json(
      { success: true, data: null } satisfies ApiResponse<null>,
    );
  } catch (err) {
    console.error('[Navigation DELETE] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: '메뉴 삭제에 실패했습니다.' } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
  });
}
