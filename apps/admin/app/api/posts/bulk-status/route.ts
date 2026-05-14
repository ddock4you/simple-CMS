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
  resource: 'posts',
  action: 'update',
  inputSchema: bulkStatusSchema,
  successKey: 'updated',
  failKey: 'failed',
  processItem: async (id, ctx) => {
    const post = await prisma.post.findFirst({ where: { id } });
    if (!post) return { kind: 'skip' };
    if (post.status === ctx.parsed.status) return { kind: 'skip' };

    const updateData: Record<string, unknown> = { status: ctx.parsed.status };
    if (ctx.parsed.status === 'PUBLISHED' && post.status === 'DRAFT') {
      updateData.publishedAt = new Date();
    }

    try {
      await prisma.post.update({ where: { id }, data: updateData });

      void logAuditEvent({
        action: 'UPDATE',
        entityType: 'POST',
        entityId: id,
        entityTitle: `${post.title} (상태 변경)`,
        changes: {
          before: { status: post.status },
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
