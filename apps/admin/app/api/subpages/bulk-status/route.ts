import { z } from 'zod';

import { prisma, logAuditEvent } from '@simple-cms/db';

import { defineBulkOperation } from '@/shared/api/defineBulkOperation';

const bulkStatusSchema = z.object({
  ids: z
    .array(z.string().min(1))
    .min(1, '대상을 선택해주세요.')
    .max(200, '한 번에 최대 200개까지 처리할 수 있습니다.'),
  status: z.enum(['DRAFT', 'PUBLISHED']),
});

interface FailedItem {
  id: string;
  reason: string;
}

export const POST = defineBulkOperation<z.infer<typeof bulkStatusSchema>, FailedItem>({
  resource: 'subpages',
  action: 'update',
  inputSchema: bulkStatusSchema,
  successKey: 'updated',
  failKey: 'failed',
  processItem: async (id, ctx) => {
    const subpage = await prisma.subpage.findFirst({ where: { id } });
    if (!subpage) return { kind: 'skip' };
    if (subpage.status === ctx.parsed.status) return { kind: 'skip' };

    const updateData: Record<string, unknown> = { status: ctx.parsed.status };
    if (ctx.parsed.status === 'PUBLISHED' && subpage.status === 'DRAFT') {
      updateData.publishedAt = new Date();
    }

    try {
      await prisma.subpage.update({ where: { id }, data: updateData });

      void logAuditEvent({
        action: 'UPDATE',
        entityType: 'SUBPAGE',
        entityId: id,
        entityTitle: `${subpage.title} (상태 변경)`,
        changes: {
          before: { status: subpage.status },
          after: { status: ctx.parsed.status },
        },
        userId: ctx.user.id,
        ipAddress: ctx.auditCtx.ipAddress,
        userAgent: ctx.auditCtx.userAgent,
      });

      return { kind: 'success' };
    } catch (e) {
      return {
        kind: 'fail',
        data: {
          id,
          reason: e instanceof Error ? e.message : '알 수 없는 오류',
        },
      };
    }
  },
});
