import { NextResponse } from 'next/server';

import { prisma } from '@simple-cms/db';
import type { ApiResponse, PaginatedResponse } from '@simple-cms/types';

import { requirePermission } from '@/entities/auth/lib/requirePermission';
import { runWithUserDemoSession } from '@/entities/auth/lib/runWithUserDemoSession';
import { auditLogListQuerySchema } from '@/features/audit-log/model/auditLogSchemas';
import type { AuditLogListItem } from '@/features/audit-log/model/auditLogFilters';

export async function GET(request: Request): Promise<NextResponse> {
  const { user, error } = await requirePermission('auditLogs', 'read');
  if (error) return error;

  return runWithUserDemoSession(user, async () => {
    try {
    const { searchParams } = new URL(request.url);
    const parsed = auditLogListQuerySchema.safeParse({
      action: searchParams.get('action') ?? undefined,
      entityType: searchParams.get('entityType') ?? undefined,
      userId: searchParams.get('userId') ?? undefined,
      from: searchParams.get('from') ?? undefined,
      to: searchParams.get('to') ?? undefined,
      page: searchParams.get('page') ?? undefined,
      pageSize: searchParams.get('pageSize') ?? undefined,
      q: searchParams.get('q') ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: '잘못된 요청입니다.' } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const { action, entityType, userId, from, to, page, pageSize, q } = parsed.data;

    const where: Record<string, unknown> = { sessionId: user.sessionId };
    if (action !== 'ALL') where.action = action;
    if (entityType) where.entityType = entityType;
    if (userId) where.userId = userId;
    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
      };
    }
    if (q) where.entityTitle = { contains: q, mode: 'insensitive' };

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          entityTitle: true,
          changes: true,
          ipAddress: true,
          userAgent: true,
          createdAt: true,
          user: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.auditLog.count({ where }),
    ]);

    const data = {
      items: items.map((item) => ({
        id: item.id,
        action: item.action,
        entityType: item.entityType,
        entityId: item.entityId,
        entityTitle: item.entityTitle,
        changes: item.changes,
        userName: item.user?.name ?? null,
        ipAddress: item.ipAddress,
        userAgent: item.userAgent,
        createdAt: item.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    };

    return NextResponse.json(
      { success: true, data } satisfies ApiResponse<PaginatedResponse<AuditLogListItem>>,
    );
    } catch (err) {
    console.error('[AuditLogs GET] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: '감사 로그 조회에 실패했습니다.' } satisfies ApiResponse<never>,
      { status: 500 },
    );
    }
  });
}
