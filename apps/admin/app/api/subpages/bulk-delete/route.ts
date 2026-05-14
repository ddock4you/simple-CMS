import { z } from 'zod';

import { prisma, logAuditEvent } from '@simple-cms/db';

import { defineBulkOperation } from '@/shared/api/defineBulkOperation';
import { renormalizeDisplayOrder } from '@/shared/api/renormalizeDisplayOrder';

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

export const POST = defineBulkOperation<z.infer<typeof bulkDeleteSchema>, BlockedItem>({
  resource: 'subpages',
  action: 'delete',
  inputSchema: bulkDeleteSchema,
  successKey: 'deleted',
  failKey: 'blocked',
  processItem: async (id, ctx) => {
    const subpage = await prisma.subpage.findFirst({
      where: { id },
      include: { _count: { select: { navigationMenuItems: true } } },
    });
    if (!subpage) return { kind: 'skip' };
    if (subpage._count.navigationMenuItems > 0) {
      return {
        kind: 'fail',
        data: {
          id,
          title: subpage.title,
          reason: `메뉴 항목 ${subpage._count.navigationMenuItems}개에서 참조 중`,
        },
      };
    }

    await prisma.subpage.delete({ where: { id } });

    void logAuditEvent({
      action: 'DELETE',
      entityType: 'SUBPAGE',
      entityId: id,
      entityTitle: subpage.title,
      changes: {
        before: {
          title: subpage.title,
          slug: subpage.slug,
          status: subpage.status,
        },
      },
      userId: ctx.user.id,
      ipAddress: ctx.auditCtx.ipAddress,
      userAgent: ctx.auditCtx.userAgent,
    });

    return { kind: 'success' };
  },
  afterAll: async () => {
    await renormalizeDisplayOrder({ model: 'subpage' });
  },
});
