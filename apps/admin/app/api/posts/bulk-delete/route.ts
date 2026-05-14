import { z } from 'zod';

import { prisma, logAuditEvent } from '@simple-cms/db';

import { defineBulkOperation } from '@/shared/api/defineBulkOperation';
import { renormalizeDisplayOrder } from '@/shared/api/renormalizeDisplayOrder';

const bulkDeleteSchema = z.object({
  ids: z
    .array(z.string().min(1))
    .min(1, '삭제할 게시글을 선택해주세요.')
    .max(200, '한 번에 최대 200개까지 삭제할 수 있습니다.'),
});

interface BlockedItem {
  id: string;
  title: string;
  reason: string;
}

export const POST = defineBulkOperation<z.infer<typeof bulkDeleteSchema>, BlockedItem>({
  resource: 'posts',
  action: 'delete',
  inputSchema: bulkDeleteSchema,
  successKey: 'deleted',
  failKey: 'blocked',
  processItem: async (id, ctx) => {
    const post = await prisma.post.findFirst({ where: { id } });
    if (!post) return { kind: 'skip' };

    try {
      await prisma.post.delete({ where: { id } });

      void logAuditEvent({
        action: 'DELETE',
        entityType: 'POST',
        entityId: id,
        entityTitle: post.title,
        changes: {
          before: {
            title: post.title,
            slug: post.slug,
            boardId: post.boardId,
          },
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
          title: post.title,
          reason: e instanceof Error ? e.message : '알 수 없는 오류',
        },
      };
    }
  },
  afterAll: async () => {
    await renormalizeDisplayOrder({ model: 'post' });
  },
});
