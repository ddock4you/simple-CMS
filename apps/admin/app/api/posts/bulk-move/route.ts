import { NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma, logAuditEvent } from '@simple-cms/db';
import type { ApiResponse } from '@simple-cms/types';

import { defineRoute } from '@/entities/auth/lib/defineRoute';

const bulkMoveSchema = z.object({
  ids: z
    .array(z.string().min(1))
    .min(1, '대상을 선택해주세요.')
    .max(200, '한 번에 최대 200개까지 처리할 수 있습니다.'),
  boardId: z.string().min(1, '게시판을 선택해주세요.'),
});

interface FailedItem {
  id: string;
  title: string;
  reason: string;
}

interface BulkMoveResult {
  updated: string[];
  failed: FailedItem[];
}

export const POST = defineRoute<z.infer<typeof bulkMoveSchema>, BulkMoveResult>({
  resource: 'posts',
  action: 'update',
  schema: bulkMoveSchema,
  handler: async ({ user, parsed, auditCtx }) => {
    const { ids, boardId } = parsed;

    const targetBoard = await prisma.board.findFirst({ where: { id: boardId } });
    if (!targetBoard) {
      return NextResponse.json(
        { success: false, error: '대상 게시판을 찾을 수 없습니다.' } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const posts = await prisma.post.findMany({ where: { id: { in: ids } } });

    const updated: string[] = [];
    const failed: FailedItem[] = [];

    for (const post of posts) {
      if (post.boardId === boardId) continue;

      const existing = await prisma.post.findFirst({
        where: { boardId, slug: post.slug },
      });
      if (existing) {
        failed.push({
          id: post.id,
          title: post.title,
          reason: `대상 게시판에 같은 slug(${post.slug})가 이미 존재`,
        });
        continue;
      }

      try {
        await prisma.post.update({
          where: { id: post.id },
          data: { boardId },
        });

        void logAuditEvent({
          action: 'UPDATE',
          entityType: 'POST',
          entityId: post.id,
          entityTitle: `${post.title} (게시판 이동)`,
          changes: {
            before: { boardId: post.boardId },
            after: { boardId },
          },
          userId: user.id,
          ipAddress: auditCtx.ipAddress,
          userAgent: auditCtx.userAgent,
        });

        updated.push(post.id);
      } catch (e) {
        failed.push({
          id: post.id,
          title: post.title,
          reason: e instanceof Error ? e.message : '알 수 없는 오류',
        });
      }
    }

    return { updated, failed };
  },
});
