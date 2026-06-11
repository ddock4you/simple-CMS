import { NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma, logAuditEvent } from '@simple-cms/db';
import type { ApiResponse } from '@simple-cms/types';

import { withPermissionRoute } from '@/shared/api/withAdminRouteScope';
import {
  assertNotLastSystemAdmin,
  LastSystemAdminError,
} from '@/features/user-management/lib/userGuards';

const bulkRoleSchema = z.object({
  ids: z
    .array(z.string().min(1))
    .min(1, '역할을 변경할 사용자를 선택해주세요.')
    .max(200, '한 번에 최대 200명까지 처리할 수 있습니다.'),
  roleId: z.string().min(1, '역할을 선택해주세요.'),
});

interface BlockedItem {
  id: string;
  username: string;
  reason: string;
}

interface BulkRoleResponse {
  updated: string[];
  blocked: BlockedItem[];
}

export const POST = withPermissionRoute(
  'users',
  'update',
  async (request, ctx) => {
    try {
      const body = await request.json();
      const parsed = bulkRoleSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          {
            success: false,
            error: parsed.error.issues[0]?.message ?? '잘못된 요청입니다.',
          } satisfies ApiResponse<never>,
          { status: 400 },
        );
      }

      const { roleId } = parsed.data;
      const ids = Array.from(new Set(parsed.data.ids));

      const newRole = await prisma.role.findUnique({ where: { id: roleId } });
      if (!newRole) {
        return NextResponse.json(
          {
            success: false,
            error: '역할을 찾을 수 없습니다.',
          } satisfies ApiResponse<never>,
          { status: 404 },
        );
      }

      if (newRole.isSystem && !ctx.user.role?.isSystem) {
        return NextResponse.json(
          {
            success: false,
            error: '총괄 관리자 역할은 총괄 관리자만 배정할 수 있습니다.',
          } satisfies ApiResponse<never>,
          { status: 403 },
        );
      }

      const users = await prisma.user.findMany({
        where: { id: { in: ids } },
        include: { role: true },
      });

      const updated: string[] = [];
      const blocked: BlockedItem[] = [];

      for (const targetUser of users) {
        if (targetUser.roleId === roleId) {
          blocked.push({
            id: targetUser.id,
            username: targetUser.username,
            reason: '이미 해당 역할입니다.',
          });
          continue;
        }

        if (targetUser.role?.isSystem && !newRole.isSystem) {
          try {
            await assertNotLastSystemAdmin(targetUser);
          } catch (e) {
            if (e instanceof LastSystemAdminError) {
              blocked.push({
                id: targetUser.id,
                username: targetUser.username,
                reason: '마지막 총괄 관리자의 역할은 변경할 수 없습니다.',
              });
              continue;
            }
            throw e;
          }
        }

        await prisma.user.update({
          where: { id: targetUser.id },
          data: { roleId },
        });

        logAuditEvent({
          action: 'UPDATE',
          entityType: 'USER',
          entityId: targetUser.id,
          entityTitle: targetUser.username,
          changes: {
            before: {
              roleId: targetUser.roleId,
              roleName: targetUser.role?.name ?? null,
            },
            after: { roleId, roleName: newRole.name },
          },
          userId: ctx.user.id,
          ipAddress: ctx.auditCtx.ipAddress,
          userAgent: ctx.auditCtx.userAgent,
        });

        updated.push(targetUser.id);
      }

      const data: BulkRoleResponse = { updated, blocked };
      return NextResponse.json({
        success: true,
        data,
      } satisfies ApiResponse<BulkRoleResponse>);
    } catch (err) {
      console.error('[Users bulk-role] Unexpected error:', err);
      return NextResponse.json(
        {
          success: false,
          error: '일괄 역할 변경에 실패했습니다.',
        } satisfies ApiResponse<never>,
        { status: 500 },
      );
    }
  },
);
