import { NextResponse } from 'next/server';

import { prisma, logAuditEvent } from '@simple-cms/db';
import type { ApiResponse } from '@simple-cms/types';

import { requirePermission } from '@/entities/auth/lib/requirePermission';
import { getAuditContext } from '@/shared/lib/auditHelpers';
import { updateMenuItemSchema } from '@/features/navigation-management/model/navigationSchemas';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ menuId: string; itemId: string }> },
): Promise<NextResponse> {
  const { user, error } = await requirePermission('navigation', 'update');
  if (error) return error;

  try {
    const { menuId, itemId } = await params;
    const item = await prisma.navigationMenuItem.findUnique({ where: { id: itemId } });
    if (!item || item.menuId !== menuId) {
      return NextResponse.json(
        { success: false, error: '메뉴 항목을 찾을 수 없습니다.' } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    const body = await request.json();
    const parsed = updateMenuItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const { label, itemType, subpageId, boardId, url, isVisible, openInNewTab, startDate, endDate } = parsed.data;

    const updateData: Record<string, unknown> = {};
    if (label !== undefined) updateData.label = label;
    if (itemType !== undefined) {
      updateData.itemType = itemType;
      updateData.subpageId = itemType === 'SUBPAGE' ? (subpageId ?? item.subpageId) : null;
      updateData.boardId = itemType === 'BOARD' ? (boardId ?? item.boardId) : null;
      updateData.url = (itemType === 'EXTERNAL' || itemType === 'CUSTOM') ? (url ?? item.url) : null;
    } else {
      if (subpageId !== undefined) updateData.subpageId = subpageId;
      if (boardId !== undefined) updateData.boardId = boardId;
      if (url !== undefined) updateData.url = url;
    }
    if (isVisible !== undefined) updateData.isVisible = isVisible;
    if (openInNewTab !== undefined) updateData.openInNewTab = openInNewTab;
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;

    const updated = await prisma.navigationMenuItem.update({
      where: { id: itemId },
      data: updateData,
    });

    const before: Record<string, string | null> = {};
    const after: Record<string, string | null> = {};
    if (label !== undefined && label !== item.label) {
      before.label = item.label;
      after.label = label;
    }
    if (itemType !== undefined && itemType !== item.itemType) {
      before.itemType = item.itemType;
      after.itemType = itemType;
    }
    if (isVisible !== undefined && isVisible !== item.isVisible) {
      before.isVisible = String(item.isVisible);
      after.isVisible = String(isVisible);
    }

    if (Object.keys(after).length > 0) {
      const auditContext = getAuditContext(request);
      logAuditEvent({
        action: 'UPDATE',
        entityType: 'NAVIGATION_MENU_ITEM',
        entityId: itemId,
        entityTitle: updated.label,
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
    console.error('[Navigation Items PATCH] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: '메뉴 항목 수정에 실패했습니다.' } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ menuId: string; itemId: string }> },
): Promise<NextResponse> {
  const { user, error } = await requirePermission('navigation', 'delete');
  if (error) return error;

  try {
    const { menuId, itemId } = await params;
    const item = await prisma.navigationMenuItem.findUnique({ where: { id: itemId } });
    if (!item || item.menuId !== menuId) {
      return NextResponse.json(
        { success: false, error: '메뉴 항목을 찾을 수 없습니다.' } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    await prisma.navigationMenuItem.delete({ where: { id: itemId } });

    // Renormalize displayOrder among siblings
    const siblings = await prisma.navigationMenuItem.findMany({
      where: { menuId, parentId: item.parentId },
      select: { id: true },
      orderBy: [{ displayOrder: 'asc' }],
    });
    for (let i = 0; i < siblings.length; i++) {
      await prisma.navigationMenuItem.update({
        where: { id: siblings[i].id },
        data: { displayOrder: i },
      });
    }

    const auditContext = getAuditContext(request);
    logAuditEvent({
      action: 'DELETE',
      entityType: 'NAVIGATION_MENU_ITEM',
      entityId: itemId,
      entityTitle: item.label,
      changes: { before: { label: item.label, itemType: item.itemType } },
      userId: user!.id,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
    });

    return NextResponse.json(
      { success: true, data: null } satisfies ApiResponse<null>,
    );
  } catch (err) {
    console.error('[Navigation Items DELETE] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: '메뉴 항목 삭제에 실패했습니다.' } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
