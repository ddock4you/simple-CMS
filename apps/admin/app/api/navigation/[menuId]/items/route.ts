import { NextResponse } from 'next/server';

import { prisma, logAuditEvent } from '@simple-cms/db';
import type { ApiResponse } from '@simple-cms/types';

import { requirePermission } from '@/entities/auth/lib/requirePermission';
import { runWithUserDemoSession } from '@/entities/auth/lib/runWithUserDemoSession';
import { getAuditContext } from '@/shared/lib/auditHelpers';
import { createMenuItemSchema } from '@/features/navigation-management/model/navigationSchemas';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ menuId: string }> },
): Promise<NextResponse> {
  const { user, error } = await requirePermission('navigation', 'create');
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
    const parsed = createMenuItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const { parentId, label, itemType, subpageId, boardId, url, isVisible, openInNewTab, startDate, endDate } = parsed.data;

    // Validate parent exists and enforce max 3 depth
    if (parentId) {
      const parent = await prisma.navigationMenuItem.findUnique({
        where: { id: parentId },
        select: { id: true, menuId: true, parentId: true },
      });
      if (!parent || parent.menuId !== menuId) {
        return NextResponse.json(
          { success: false, error: '상위 항목을 찾을 수 없습니다.' } satisfies ApiResponse<never>,
          { status: 400 },
        );
      }
      // Walk up the parent chain to calculate depth
      let depth = 1;
      let currentParentId = parent.parentId;
      while (currentParentId) {
        depth++;
        const ancestor = await prisma.navigationMenuItem.findUnique({
          where: { id: currentParentId },
          select: { parentId: true },
        });
        currentParentId = ancestor?.parentId ?? null;
      }
      if (depth >= 3) {
        return NextResponse.json(
          { success: false, error: '최대 3단계까지만 허용됩니다.' } satisfies ApiResponse<never>,
          { status: 400 },
        );
      }
    }

    // Validate itemType-specific fields
    if (itemType === 'SUBPAGE' && !subpageId) {
      return NextResponse.json(
        { success: false, error: '서브 페이지를 선택해주세요.' } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }
    if (itemType === 'BOARD' && !boardId) {
      return NextResponse.json(
        { success: false, error: '게시판을 선택해주세요.' } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }
    if ((itemType === 'EXTERNAL' || itemType === 'CUSTOM') && !url) {
      return NextResponse.json(
        { success: false, error: 'URL을 입력해주세요.' } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    // Calculate displayOrder (max + 1 among siblings)
    const maxOrder = await prisma.navigationMenuItem.aggregate({
      where: { menuId, parentId: parentId ?? null },
      _max: { displayOrder: true },
    });
    const displayOrder = (maxOrder._max.displayOrder ?? -1) + 1;

    const item = await prisma.navigationMenuItem.create({
      data: {
        menuId,
        parentId: parentId ?? null,
        label,
        itemType,
        subpageId: itemType === 'SUBPAGE' ? subpageId : null,
        boardId: itemType === 'BOARD' ? boardId : null,
        url: itemType === 'EXTERNAL' || itemType === 'CUSTOM' ? url : null,
        isVisible,
        openInNewTab: itemType === 'GROUP' ? false : openInNewTab,
        displayOrder,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
    });

    const auditContext = getAuditContext(request);
    logAuditEvent({
      action: 'CREATE',
      entityType: 'NAVIGATION_MENU_ITEM',
      entityId: item.id,
      entityTitle: label,
      changes: { after: { label, itemType, parentId: parentId ?? null } },
      userId: user!.id,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
    });

    return NextResponse.json(
      { success: true, data: { id: item.id } } satisfies ApiResponse<{ id: string }>,
      { status: 201 },
    );
  } catch (err) {
    console.error('[Navigation Items POST] Unexpected error:', err);
    const message = err instanceof Error ? err.message : '메뉴 항목 추가에 실패했습니다.';
    return NextResponse.json(
      { success: false, error: message } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
  });
}
