import { NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma, logAuditEvent } from '@simple-cms/db';
import type { ApiResponse } from '@simple-cms/types';

import { withPermissionRoute } from '@/entities/auth/lib/withAdminRouteScope';

const bulkApproveSchema = z.object({
  ids: z
    .array(z.string().min(1))
    .min(1, '승인할 사용자를 선택해주세요.')
    .max(200, '한 번에 최대 200명까지 처리할 수 있습니다.'),
});

interface BlockedItem {
  id: string;
  username: string;
  reason: string;
}

interface BulkApproveResponse {
  updated: string[];
  blocked: BlockedItem[];
}

export const POST = withPermissionRoute(
  'users',
  'update',
  async (request, ctx) => {
    try {
      const body = await request.json();
      const parsed = bulkApproveSchema.safeParse(body);
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

      const defaultRole = await prisma.role.findFirst({
        where: { isDefault: true },
      });
      if (!defaultRole) {
        return NextResponse.json(
          {
            success: false,
            error: '기본 역할이 설정되지 않아 승인할 수 없습니다.',
          } satisfies ApiResponse<never>,
          { status: 400 },
        );
      }

      const users = await prisma.user.findMany({ where: { id: { in: ids } } });

      const updated: string[] = [];
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

        await prisma.user.update({
          where: { id: targetUser.id },
          data: { status: 'ACTIVE', roleId: defaultRole.id },
        });

        logAuditEvent({
          action: 'UPDATE',
          entityType: 'USER',
          entityId: targetUser.id,
          entityTitle: targetUser.username,
          changes: {
            before: { status: 'PENDING', roleId: null },
            after: {
              status: 'ACTIVE',
              roleId: defaultRole.id,
              roleName: defaultRole.name,
            },
          },
          userId: ctx.user.id,
          ipAddress: ctx.auditCtx.ipAddress,
          userAgent: ctx.auditCtx.userAgent,
        });

        updated.push(targetUser.id);
      }

      const data: BulkApproveResponse = { updated, blocked };
      return NextResponse.json({
        success: true,
        data,
      } satisfies ApiResponse<BulkApproveResponse>);
    } catch (err) {
      console.error('[Users bulk-approve] Unexpected error:', err);
      return NextResponse.json(
        {
          success: false,
          error: '일괄 승인에 실패했습니다.',
        } satisfies ApiResponse<never>,
        { status: 500 },
      );
    }
  },
);
