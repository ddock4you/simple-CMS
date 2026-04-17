import { NextResponse } from 'next/server';
import { z } from 'zod';

import { logAuditEvent, prisma } from '@simple-cms/db';
import type { ApiResponse } from '@simple-cms/types';

import { requirePermission } from '@/entities/auth/lib/requirePermission';
import { getAuditContext } from '@/shared/lib/auditHelpers';

const bulkDeleteSchema = z.object({
  ids: z
    .array(z.string().min(1))
    .min(1, '삭제할 서브 페이지를 선택해주세요.')
    .max(200, '한 번에 최대 200개까지 삭제할 수 있습니다.'),
});

interface BlockedItem {
  id: string;
  title: string;
  reason: string;
}

interface BulkDeleteResponse {
  deleted: string[];
  blocked: BlockedItem[];
}

export async function POST(request: Request): Promise<NextResponse> {
  const { user, error } = await requirePermission('subpages', 'delete');
  if (error) return error;

  try {
    const body = await request.json();
    const parsed = bulkDeleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message ?? '잘못된 요청입니다.',
        } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const ids = Array.from(new Set(parsed.data.ids));

    const subpages = await prisma.subpage.findMany({
      where: { id: { in: ids } },
      include: { _count: { select: { navigationMenuItems: true } } },
    });

    const auditContext = getAuditContext(request);
    const deleted: string[] = [];
    const blocked: BlockedItem[] = [];

    for (const subpage of subpages) {
      if (subpage._count.navigationMenuItems > 0) {
        blocked.push({
          id: subpage.id,
          title: subpage.title,
          reason: `메뉴 항목 ${subpage._count.navigationMenuItems}개에서 참조 중`,
        });
        continue;
      }

      await prisma.subpage.delete({ where: { id: subpage.id } });

      logAuditEvent({
        action: 'DELETE',
        entityType: 'SUBPAGE',
        entityId: subpage.id,
        entityTitle: subpage.title,
        changes: {
          before: {
            title: subpage.title,
            slug: subpage.slug,
            status: subpage.status,
          },
        },
        userId: user!.id,
        ipAddress: auditContext.ipAddress,
        userAgent: auditContext.userAgent,
      });

      deleted.push(subpage.id);
    }

    if (deleted.length > 0) {
      const remaining = await prisma.subpage.findMany({
        select: { id: true },
        orderBy: [{ displayOrder: 'asc' }, { updatedAt: 'desc' }],
      });
      for (let i = 0; i < remaining.length; i++) {
        await prisma.subpage.update({
          where: { id: remaining[i].id },
          data: { displayOrder: i },
        });
      }
    }

    const data: BulkDeleteResponse = { deleted, blocked };
    return NextResponse.json(
      { success: true, data } satisfies ApiResponse<BulkDeleteResponse>,
    );
  } catch (err) {
    console.error('[Subpages bulk-delete] Unexpected error:', err);
    const message =
      err instanceof Error ? err.message : '일괄 삭제에 실패했습니다.';
    return NextResponse.json(
      { success: false, error: message } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
