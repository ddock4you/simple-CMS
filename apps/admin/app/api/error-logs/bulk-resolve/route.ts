import { NextResponse } from 'next/server';

import { logAuditEvent, prisma } from '@simple-cms/db';
import type { ApiResponse } from '@simple-cms/types';

import { requirePermission } from '@/entities/auth/lib/requirePermission';
import { runWithUserDemoSession } from '@/entities/auth/lib/runWithUserDemoSession';
import { getAuditContext } from '@/shared/lib/auditHelpers';
import { errorLogBulkResolveBodySchema } from '@/features/error-log/model/errorLogSchemas';

export async function POST(request: Request): Promise<NextResponse> {
  const { user, error } = await requirePermission('errorLogs', 'update');
  if (error) return error;

  return runWithUserDemoSession(user, async () => {
    try {
      const body = await request.json();
      const parsed = errorLogBulkResolveBodySchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          {
            success: false,
            error: '잘못된 요청입니다.',
          } satisfies ApiResponse<never>,
          { status: 400 },
        );
      }

      const { fingerprint, isResolved } = parsed.data;

      const result = await prisma.errorLog.updateMany({
        where: { fingerprint, sessionId: user.sessionId },
        data: {
          isResolved,
          resolvedAt: isResolved ? new Date() : null,
          resolvedBy: isResolved ? user.id : null,
        },
      });

      const context = getAuditContext(request);
      void logAuditEvent({
        action: 'UPDATE',
        entityType: 'ERROR_LOG',
        entityTitle: `fingerprint: ${fingerprint}`,
        changes: {
          after: {
            fingerprint,
            count: result.count,
            isResolved,
          },
        },
        userId: user.id,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });

      return NextResponse.json({
        success: true,
        data: { count: result.count },
      } satisfies ApiResponse<{ count: number }>);
    } catch (err) {
      console.error('[ErrorLog BulkResolve] Unexpected error:', err);
      return NextResponse.json(
        {
          success: false,
          error: '일괄 처리에 실패했습니다.',
        } satisfies ApiResponse<never>,
        { status: 500 },
      );
    }
  });
}
