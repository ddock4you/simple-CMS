import { NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma, logAuditEvent } from '@simple-cms/db';
import type { ApiResponse } from '@simple-cms/types';

import { withPermissionRoute } from '@/shared/api/withAdminRouteScope';

const bulkRejectSchema = z.object({
  ids: z
    .array(z.string().min(1))
    .min(1, '거절할 사용자를 선택해주세요.')
    .max(200, '한 번에 최대 200명까지 처리할 수 있습니다.'),
});

interface BlockedItem {
  id: string;
  username: string;
  reason: string;
}

interface BulkRejectResponse {
  deleted: string[];
  blocked: BlockedItem[];
}

export const POST = withPermissionRoute(
  'users',
  'delete',
  async (request, ctx) => {
    try {
      const body = await request.json();
      const parsed = bulkRejectSchema.safeParse(body);
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

      const users = await prisma.user.findMany({ where: { id: { in: ids } } });

      const deleted: string[] = [];
      const blocked: BlockedItem[] = [];

      for (const targetUser of users) {
        if (targetUser.status !== 'PENDING') {
          blocked.push({
            id: targetUser.id,
            username: targetUser.username,
            reason: '승인 대기 상태가 아닙니다.',
          });
          continue;
        }

        await prisma.user.delete({ where: { id: targetUser.id } });

        logAuditEvent({
          action: 'DELETE',
          entityType: 'USER',
          entityId: targetUser.id,
          entityTitle: targetUser.username,
          changes: {
            before: { status: 'PENDING', username: targetUser.username },
          },
          userId: ctx.user.id,
          ipAddress: ctx.auditCtx.ipAddress,
          userAgent: ctx.auditCtx.userAgent,
        });

        deleted.push(targetUser.id);
      }

      const data: BulkRejectResponse = { deleted, blocked };
      return NextResponse.json({
        success: true,
        data,
      } satisfies ApiResponse<BulkRejectResponse>);
    } catch (err) {
      console.error('[Users bulk-reject] Unexpected error:', err);
      return NextResponse.json(
        {
          success: false,
          error: '일괄 거절에 실패했습니다.',
        } satisfies ApiResponse<never>,
        { status: 500 },
      );
    }
  },
);
