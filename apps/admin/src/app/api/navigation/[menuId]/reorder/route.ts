import { NextResponse } from 'next/server';

import { prisma, logAuditEvent } from '@simple-cms/db';
import type { ApiResponse } from '@simple-cms/types';

import { requirePermission } from '@/entities/auth/lib/requirePermission';
import { getAuditContext } from '@/shared/lib/auditHelpers';
import { reorderItemsSchema } from '@/features/navigation-management/model/navigationSchemas';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ menuId: string }> },
): Promise<NextResponse> {
  const { user, error } = await requirePermission('navigation', 'update');
  if (error) return error;

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
    const parsed = reorderItemsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: '잘못된 요청입니다.' } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const { items } = parsed.data;

    // Validate all items belong to this menu
    const itemIds = items.map((i) => i.id);
    const existingItems = await prisma.navigationMenuItem.findMany({
      where: { id: { in: itemIds }, menuId },
      select: { id: true },
    });
    if (existingItems.length !== itemIds.length) {
      return NextResponse.json(
        { success: false, error: '일부 항목이 이 메뉴에 속하지 않습니다.' } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    // Batch update displayOrder
    for (const item of items) {
      await prisma.navigationMenuItem.update({
        where: { id: item.id },
        data: { displayOrder: item.displayOrder },
      });
    }

    const auditContext = getAuditContext(request);
    logAuditEvent({
      action: 'UPDATE',
      entityType: 'NAVIGATION_MENU',
      entityId: menuId,
      entityTitle: menu.name,
      changes: { after: { reorderedItems: itemIds.length + '건' } },
      userId: user!.id,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
    });

    return NextResponse.json(
      { success: true, data: null } satisfies ApiResponse<null>,
    );
  } catch (err) {
    console.error('[Navigation Reorder PATCH] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: '순서 변경에 실패했습니다.' } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
