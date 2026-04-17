import { NextResponse } from 'next/server';
import { z } from 'zod';

import { logAuditEvent, prisma } from '@simple-cms/db';
import type { ApiResponse } from '@simple-cms/types';

import { requirePermission } from '@/entities/auth/lib/requirePermission';
import { getAuditContext } from '@/shared/lib/auditHelpers';

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

interface BulkMoveResponse {
  updated: string[];
  failed: FailedItem[];
}

export async function POST(request: Request): Promise<NextResponse> {
  const { user, error } = await requirePermission('posts', 'update');
  if (error) return error;

  try {
    const body = await request.json();
    const parsed = bulkMoveSchema.safeParse(body);
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
    const { boardId } = parsed.data;

    const targetBoard = await prisma.board.findUnique({ where: { id: boardId } });
    if (!targetBoard) {
      return NextResponse.json(
        { success: false, error: '대상 게시판을 찾을 수 없습니다.' } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const posts = await prisma.post.findMany({ where: { id: { in: ids } } });

    const auditContext = getAuditContext(request);
    const updated: string[] = [];
    const failed: FailedItem[] = [];

    for (const post of posts) {
      if (post.boardId === boardId) continue;

      // slug 충돌 검사 (대상 게시판에서 같은 slug 존재 여부)
      const existing = await prisma.post.findUnique({
        where: { boardId_slug: { boardId, slug: post.slug } },
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

        logAuditEvent({
          action: 'UPDATE',
          entityType: 'POST',
          entityId: post.id,
          entityTitle: `${post.title} (게시판 이동)`,
          changes: {
            before: { boardId: post.boardId },
            after: { boardId },
          },
          userId: user!.id,
          ipAddress: auditContext.ipAddress,
          userAgent: auditContext.userAgent,
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

    const data: BulkMoveResponse = { updated, failed };
    return NextResponse.json(
      { success: true, data } satisfies ApiResponse<BulkMoveResponse>,
    );
  } catch (err) {
    console.error('[Posts bulk-move] Unexpected error:', err);
    const message =
      err instanceof Error ? err.message : '일괄 이동에 실패했습니다.';
    return NextResponse.json(
      { success: false, error: message } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
