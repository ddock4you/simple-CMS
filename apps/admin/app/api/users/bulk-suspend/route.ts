import { NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma, logAuditEvent, deleteUserSessions } from '@simple-cms/db';
import type { ApiResponse } from '@simple-cms/types';

import { requirePermission } from '@/entities/auth/lib/requirePermission';
import { getAuditContext } from '@/shared/lib/auditHelpers';
import {
  assertNotLastSystemAdmin,
  LastSystemAdminError,
} from '@/features/user-management/lib/userGuards';

const bulkSuspendSchema = z.object({
  ids: z
    .array(z.string().min(1))
    .min(1, '정지할 사용자를 선택해주세요.')
    .max(200, '한 번에 최대 200명까지 처리할 수 있습니다.'),
});

interface BlockedItem {
  id: string;
  username: string;
  reason: string;
}

interface BulkSuspendResponse {
  updated: string[];
  blocked: BlockedItem[];
}

export async function POST(request: Request): Promise<NextResponse> {
  const { user: currentUser, error } = await requirePermission('users', 'update');
  if (error) return error;

  try {
    const body = await request.json();
    const parsed = bulkSuspendSchema.safeParse(body);
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

    const users = await prisma.user.findMany({
      where: { id: { in: ids } },
      include: { role: true },
    });

    const auditContext = getAuditContext(request);
    const updated: string[] = [];
    const blocked: BlockedItem[] = [];

    for (const targetUser of users) {
      if (targetUser.id === currentUser!.id) {
        blocked.push({
          id: targetUser.id,
          username: targetUser.username,
          reason: '자기 자신을 정지할 수 없습니다.',
        });
        continue;
      }

      if (targetUser.status !== 'ACTIVE') {
        blocked.push({
          id: targetUser.id,
          username: targetUser.username,
          reason: '활성 상태가 아닙니다.',
        });
        continue;
      }

      try {
        await assertNotLastSystemAdmin(targetUser);
      } catch (e) {
        if (e instanceof LastSystemAdminError) {
          blocked.push({
            id: targetUser.id,
            username: targetUser.username,
            reason: e.message,
          });
          continue;
        }
        throw e;
      }

      await prisma.user.update({
        where: { id: targetUser.id },
        data: { status: 'SUSPENDED' },
      });

      await deleteUserSessions(targetUser.id);

      logAuditEvent({
        action: 'UPDATE',
        entityType: 'USER',
        entityId: targetUser.id,
        entityTitle: targetUser.username,
        changes: {
          before: { status: 'ACTIVE' },
          after: { status: 'SUSPENDED' },
        },
        userId: currentUser!.id,
        ipAddress: auditContext.ipAddress,
        userAgent: auditContext.userAgent,
      });

      updated.push(targetUser.id);
    }

    const data: BulkSuspendResponse = { updated, blocked };
    return NextResponse.json(
      { success: true, data } satisfies ApiResponse<BulkSuspendResponse>,
    );
  } catch (err) {
    console.error('[Users bulk-suspend] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: '일괄 정지에 실패했습니다.' } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
