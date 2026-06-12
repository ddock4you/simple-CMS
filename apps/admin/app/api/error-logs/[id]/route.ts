import { NextResponse } from 'next/server';

import { logAuditEvent, prisma } from '@simple-cms/db';
import type { ApiResponse } from '@simple-cms/types';

import { requirePermission } from '@/entities/auth/lib/requirePermission';
import { getAuditContext } from '@/shared/lib/auditHelpers';
import { runWithUserDemoSession } from '@/entities/auth/lib/runWithUserDemoSession';
import type { ErrorLogDetail } from '@/features/error-log/model/errorLogFilters';
import { errorLogResolveBodySchema } from '@/features/error-log/model/errorLogSchemas';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  const { user, error } = await requirePermission('errorLogs', 'read');
  if (error) return error;

  return runWithUserDemoSession(user, async () => {
    const { id } = await params;

    try {
      const log = await prisma.errorLog.findFirst({
        where: { id, sessionId: user.sessionId },
      });
      if (!log) {
        return NextResponse.json(
          {
            success: false,
            error: '에러 로그를 찾을 수 없습니다.',
          } satisfies ApiResponse<never>,
          { status: 404 },
        );
      }

      let resolvedByName: string | null = null;
      if (log.resolvedBy) {
        const resolver = await prisma.user.findUnique({
          where: { id: log.resolvedBy },
          select: { name: true },
        });
        resolvedByName = resolver?.name ?? null;
      }

      const data: ErrorLogDetail = {
        id: log.id,
        level: log.level,
        source: log.source,
        message: log.message,
        stack: log.stack,
        url: log.url,
        method: log.method,
        statusCode: log.statusCode,
        userAgent: log.userAgent,
        ipAddress: log.ipAddress,
        referer: log.referer,
        digest: log.digest,
        fingerprint: log.fingerprint,
        metadata: log.metadata,
        isResolved: log.isResolved,
        resolvedAt: log.resolvedAt?.toISOString() ?? null,
        resolvedBy: log.resolvedBy,
        resolvedByName,
        createdAt: log.createdAt.toISOString(),
      };

      return NextResponse.json({
        success: true,
        data,
      } satisfies ApiResponse<ErrorLogDetail>);
    } catch (err) {
      console.error('[ErrorLog GET] Unexpected error:', err);
      return NextResponse.json(
        {
          success: false,
          error: '에러 로그 조회에 실패했습니다.',
        } satisfies ApiResponse<never>,
        { status: 500 },
      );
    }
  });
}

export async function PATCH(
  request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  const { user, error } = await requirePermission('errorLogs', 'update');
  if (error) return error;

  return runWithUserDemoSession(user, async () => {
    const { id } = await params;

    try {
      const body = await request.json();
      const parsed = errorLogResolveBodySchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          {
            success: false,
            error: '잘못된 요청입니다.',
          } satisfies ApiResponse<never>,
          { status: 400 },
        );
      }

      const existing = await prisma.errorLog.findFirst({
        where: { id, sessionId: user.sessionId },
        select: { id: true, isResolved: true, message: true },
      });
      if (!existing) {
        return NextResponse.json(
          {
            success: false,
            error: '에러 로그를 찾을 수 없습니다.',
          } satisfies ApiResponse<never>,
          { status: 404 },
        );
      }

      const { isResolved } = parsed.data;
      await prisma.errorLog.update({
        where: { id, sessionId: user.sessionId },
        data: {
          isResolved,
          resolvedAt: isResolved ? new Date() : null,
          resolvedBy: isResolved ? user.id : null,
        },
      });

      // 감사 로그: fire-and-forget
      const context = getAuditContext(request);
      void logAuditEvent({
        action: 'UPDATE',
        entityType: 'ERROR_LOG',
        entityId: id,
        entityTitle:
          existing.message.split('\n')[0]?.slice(0, 100) ?? undefined,
        changes: {
          before: { isResolved: existing.isResolved },
          after: { isResolved },
        },
        userId: user.id,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });

      return NextResponse.json({
        success: true,
        data: null,
      } satisfies ApiResponse<null>);
    } catch (err) {
      console.error('[ErrorLog PATCH] Unexpected error:', err);
      return NextResponse.json(
        {
          success: false,
          error: '에러 로그 상태 변경에 실패했습니다.',
        } satisfies ApiResponse<never>,
        { status: 500 },
      );
    }
  });
}
