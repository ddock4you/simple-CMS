import { NextResponse } from 'next/server';

import { prisma } from '@simple-cms/db';
import type { ApiResponse, PaginatedResponse } from '@simple-cms/types';

import { requirePermission } from '@/entities/auth/lib/requirePermission';
import { runWithUserDemoSession } from '@/shared/api/runWithUserDemoSession';
import type {
  ErrorLogGroupItem,
  ErrorLogListItem,
  ErrorLogRow,
} from '@/features/error-log/model/errorLogFilters';
import { errorLogListQuerySchema } from '@/features/error-log/model/errorLogSchemas';

function firstLine(msg: string): string {
  return msg.split('\n')[0]?.slice(0, 300) ?? '';
}

export async function GET(request: Request): Promise<NextResponse> {
  const { user, error } = await requirePermission('errorLogs', 'read');
  if (error) return error;

  return runWithUserDemoSession(user, async () => {
    try {
      const { searchParams } = new URL(request.url);
      const parsed = errorLogListQuerySchema.safeParse({
        level: searchParams.get('level') ?? undefined,
        source: searchParams.get('source') ?? undefined,
        resolved: searchParams.get('resolved') ?? undefined,
        urlPattern: searchParams.get('urlPattern') ?? undefined,
        search: searchParams.get('search') ?? undefined,
        groupByFingerprint: searchParams.get('groupByFingerprint') ?? undefined,
        from: searchParams.get('from') ?? undefined,
        to: searchParams.get('to') ?? undefined,
        page: searchParams.get('page') ?? undefined,
        pageSize: searchParams.get('pageSize') ?? undefined,
      });

      if (!parsed.success) {
        return NextResponse.json(
          {
            success: false,
            error: '잘못된 요청입니다.',
          } satisfies ApiResponse<never>,
          { status: 400 },
        );
      }

      const {
        level,
        source,
        resolved,
        urlPattern,
        groupByFingerprint,
        from,
        to,
        page,
        pageSize,
      } = parsed.data;

      const where: Record<string, unknown> = { sessionId: user.sessionId };
      if (level !== 'ALL') where.level = level;
      if (source !== 'ALL') where.source = source;
      if (resolved === 'resolved') where.isResolved = true;
      else if (resolved === 'unresolved') where.isResolved = false;
      if (urlPattern) {
        where.OR = [
          { url: { contains: urlPattern } },
          { message: { contains: urlPattern, mode: 'insensitive' } },
        ];
      }
      if (from || to) {
        where.createdAt = {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
        };
      }

      if (groupByFingerprint) {
        // 그룹 뷰: fingerprint 기준 집계
        const whereWithFp = { ...where, fingerprint: { not: null } };
        const [groups, allGroups] = await Promise.all([
          prisma.errorLog.groupBy({
            by: ['fingerprint'],
            where: whereWithFp,
            _count: { _all: true },
            _max: {
              createdAt: true,
              message: true,
              level: true,
              source: true,
              url: true,
              id: true,
            },
            _min: {
              isResolved: true,
            },
            orderBy: { _max: { createdAt: 'desc' } },
            skip: (page - 1) * pageSize,
            take: pageSize,
          }),
          // 총 그룹 수 (초기 단순 구현)
          prisma.errorLog.groupBy({
            by: ['fingerprint'],
            where: whereWithFp,
          }),
        ]);

        const items: ErrorLogGroupItem[] = groups.map((g) => ({
          kind: 'group',
          fingerprint: g.fingerprint ?? '',
          level: g._max.level ?? 'ERROR',
          source: g._max.source ?? 'CLIENT_JS',
          latestMessage: firstLine(g._max.message ?? ''),
          latestUrl: g._max.url ?? null,
          latestCreatedAt: g._max.createdAt?.toISOString() ?? '',
          latestId: g._max.id ?? '',
          count: g._count._all,
          // _min.isResolved가 false이면 미해결이 하나라도 있다는 뜻
          hasUnresolved: g._min.isResolved === false,
        }));

        const data = {
          items,
          total: allGroups.length,
          page,
          pageSize,
        };

        return NextResponse.json({ success: true, data } satisfies ApiResponse<
          PaginatedResponse<ErrorLogRow>
        >);
      }

      // 개별 뷰
      const [items, total] = await Promise.all([
        prisma.errorLog.findMany({
          where,
          select: {
            id: true,
            level: true,
            source: true,
            message: true,
            url: true,
            method: true,
            statusCode: true,
            fingerprint: true,
            isResolved: true,
            resolvedAt: true,
            resolvedBy: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.errorLog.count({ where }),
      ]);

      // resolvedBy는 String이므로 별도로 user 이름 조회
      const resolverIds = Array.from(
        new Set(
          items
            .map((i) => i.resolvedBy)
            .filter((id): id is string => id !== null),
        ),
      );
      const resolvers =
        resolverIds.length > 0
          ? await prisma.user.findMany({
              where: { id: { in: resolverIds } },
              select: { id: true, name: true },
            })
          : [];
      const resolverMap = new Map(resolvers.map((u) => [u.id, u.name]));

      const data = {
        items: items.map<ErrorLogListItem>((item) => ({
          kind: 'individual',
          id: item.id,
          level: item.level,
          source: item.source,
          message: firstLine(item.message),
          url: item.url,
          method: item.method,
          statusCode: item.statusCode,
          fingerprint: item.fingerprint,
          isResolved: item.isResolved,
          resolvedAt: item.resolvedAt?.toISOString() ?? null,
          resolvedByName: item.resolvedBy
            ? (resolverMap.get(item.resolvedBy) ?? null)
            : null,
          createdAt: item.createdAt.toISOString(),
        })),
        total,
        page,
        pageSize,
      };

      return NextResponse.json({ success: true, data } satisfies ApiResponse<
        PaginatedResponse<ErrorLogRow>
      >);
    } catch (err) {
      console.error('[ErrorLogs GET] Unexpected error:', err);
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
