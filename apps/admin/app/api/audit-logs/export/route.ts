import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

import { prisma } from '@simple-cms/db';
import type { AuditAction, AuditEntityType } from '@simple-cms/db';

import { requirePermission } from '@/entities/auth/lib/requirePermission';
import { auditLogExportQuerySchema } from '@/features/audit-log/model/auditLogSchemas';
import {
  ACTION_LABELS,
  ENTITY_TYPE_LABELS,
} from '@/features/audit-log/model/auditLogFilters';
import { kstStartOfDay, kstEndOfDay } from '@/shared/lib/kstDate';

export async function GET(request: Request): Promise<NextResponse> {
  const { error } = await requirePermission('auditLogs', 'read');
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const parsed = auditLogExportQuerySchema.safeParse({
      from: searchParams.get('from') ?? undefined,
      to: searchParams.get('to') ?? undefined,
      action: searchParams.get('action') ?? undefined,
      entityType: searchParams.get('entityType') ?? undefined,
      userId: searchParams.get('userId') ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const { from, to, action, entityType, userId } = parsed.data;

    const where: Record<string, unknown> = {
      createdAt: {
        gte: kstStartOfDay(from),
        lte: kstEndOfDay(to),
      },
    };
    if (action && action !== 'ALL') where.action = action;
    if (entityType) where.entityType = entityType;
    if (userId) where.userId = userId;

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

    // Header styling
    sheet.getRow(1).font = { bold: true };

    for (const log of logs) {
      sheet.addRow({
        date: log.createdAt.toISOString().replace('T', ' ').slice(0, 19),
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

    return new NextResponse(buffer as ArrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="audit-logs-${from}-${to}.xlsx"`,
      },
    });
  } catch (err) {
    console.error('[AuditLogs Export] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: '감사 로그 내보내기에 실패했습니다.' },
      { status: 500 },
    );
  }
}
