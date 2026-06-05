import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

import { logAuditEvent, prisma } from '@simple-cms/db';
import type { AuditAction, AuditEntityType } from '@simple-cms/db';

import { requirePermission } from '@/entities/auth/lib/requirePermission';
import { runWithUserDemoSession } from '@/shared/api/runWithUserDemoSession';
import { auditLogExportQuerySchema } from '@/features/audit-log/model/auditLogSchemas';
import {
  ACTION_LABELS,
  ENTITY_TYPE_LABELS,
} from '@/features/audit-log/model/auditLogFilters';
import { getAuditContext } from '@/shared/lib/auditHelpers';
import {
  kstStartOfDay,
  kstEndOfDay,
  formatKstDateTime,
  getDefaultKstRange,
} from '@/shared/lib/kstDate';

export async function GET(request: Request): Promise<NextResponse> {
  const { user, error } = await requirePermission('auditLogs', 'read');
  if (error) return error;

  return runWithUserDemoSession(user, async () => {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = auditLogExportQuerySchema.safeParse({
      from: searchParams.get('from') ?? undefined,
      to: searchParams.get('to') ?? undefined,
      action: searchParams.get('action') ?? undefined,
      entityType: searchParams.get('entityType') ?? undefined,
      userId: searchParams.get('userId') ?? undefined,
      q: searchParams.get('q') ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const { action, entityType, userId, q } = parsed.data;

    // from/to 미설정 시 KST 기준 최근 30일 폴백
    const { fromKey: fallbackFromKey, toKey: fallbackToKey } = getDefaultKstRange();
    const fromKey = parsed.data.from ?? fallbackFromKey;
    const toKey = parsed.data.to ?? fallbackToKey;

    const where: Record<string, unknown> = {
      createdAt: {
        gte: kstStartOfDay(fromKey),
        lte: kstEndOfDay(toKey),
      },
    };
    if (process.env.DEMO_MODE === 'true') where.sessionId = user.sessionId;
    if (action && action !== 'ALL') where.action = action;
    if (entityType) where.entityType = entityType;
    if (userId) where.userId = userId;
    if (q) {
      where.OR = [
        { entityTitle: { contains: q, mode: 'insensitive' } },
        { ipAddress: { contains: q, mode: 'insensitive' } },
      ];
    }

    const logs = await prisma.auditLog.findMany({
      where,
      select: {
        action: true,
        entityType: true,
        entityTitle: true,
        changes: true,
        ipAddress: true,
        createdAt: true,
        user: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10000,
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('감사 로그');

    sheet.columns = [
      { header: '날짜', key: 'date', width: 20 },
      { header: '사용자', key: 'user', width: 15 },
      { header: '액션', key: 'action', width: 12 },
      { header: '대상 타입', key: 'entityType', width: 15 },
      { header: '대상 제목', key: 'entityTitle', width: 30 },
      { header: 'IP', key: 'ip', width: 18 },
      { header: '변경 내용', key: 'changes', width: 50 },
    ];

    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: sheet.columns.length },
    };

    for (const log of logs) {
      sheet.addRow({
        date: formatKstDateTime(log.createdAt),
        user: log.user?.name ?? '-',
        action: ACTION_LABELS[log.action as AuditAction] ?? log.action,
        entityType: log.entityType
          ? (ENTITY_TYPE_LABELS[log.entityType as AuditEntityType] ?? log.entityType)
          : '-',
        entityTitle: log.entityTitle ?? '-',
        ip: log.ipAddress ?? '-',
        changes: log.changes ? JSON.stringify(log.changes, null, 0) : '-',
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();

    const auditContext = getAuditContext(request);
    logAuditEvent({
      action: 'CREATE',
      entityType: 'AUDIT_LOG',
      entityTitle: '감사 로그 내보내기',
      changes: {
        after: {
          exportRange: { from: fromKey, to: toKey },
          filters: { action: action ?? null, entityType: entityType ?? null, userId: userId ?? null, q: q ?? null },
          totalRows: logs.length,
        },
      },
      userId: user!.id,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
    });

    return new NextResponse(buffer as ArrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="audit-logs-${fromKey}-${toKey}.xlsx"`,
        'X-Row-Count': String(logs.length),
      },
    });
  } catch (err) {
    console.error('[AuditLogs Export] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: '감사 로그 내보내기에 실패했습니다.' },
      { status: 500 },
    );
  }
  });
}
