import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

import { logAuditEvent, prisma } from '@simple-cms/db';
import {
  FEEDBACK_POSITIVE_REASONS,
  type FeedbackPositiveReason,
} from '@simple-cms/types';

import { feedbackExportQuerySchema } from '@/features/subpage-feedback/model/feedbackExportSchema';
import { withPermissionRoute } from '@/entities/auth/lib/withAdminRouteScope';
import {
  kstStartOfDay,
  kstEndOfDay,
  formatKstDateTime,
  getDefaultKstRange,
} from '@/shared/lib/kstDate';

export const GET = withPermissionRoute(
  'subpage-feedback',
  'read',
  async (request, ctx) => {
    try {
      const { searchParams } = new URL(request.url);
      const parsed = feedbackExportQuerySchema.safeParse({
        from: searchParams.get('from') ?? undefined,
        to: searchParams.get('to') ?? undefined,
        rating: searchParams.get('rating') ?? undefined,
        subpageId: searchParams.get('subpageId') ?? undefined,
        q: searchParams.get('q') ?? undefined,
      });

      if (!parsed.success) {
        return NextResponse.json(
          { success: false, error: parsed.error.issues[0].message },
          { status: 400 },
        );
      }

      const { rating, subpageId, q } = parsed.data;

      // from/to가 없으면 KST 기준 최근 30일을 기본 적용. 응답 파일명도 이 값으로 채움.
      const { fromKey: fallbackFromKey, toKey: fallbackToKey } =
        getDefaultKstRange();
      const fromKey = parsed.data.from ?? fallbackFromKey;
      const toKey = parsed.data.to ?? fallbackToKey;

      const where: Record<string, unknown> = {
        createdAt: {
          gte: kstStartOfDay(fromKey),
          lte: kstEndOfDay(toKey),
        },
      };
      if (rating !== 'ALL') where.rating = rating;
      if (subpageId) where.subpageId = subpageId;
      if (q) where.comment = { contains: q, mode: 'insensitive' };

      const items = await prisma.subpageFeedback.findMany({
        where,
        select: {
          rating: true,
          positiveReasons: true,
          comment: true,
          ipAddressHash: true,
          userAgent: true,
          createdAt: true,
          subpage: { select: { title: true, slug: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('피드백 목록');

      sheet.columns = [
        { header: '제출일시', key: 'createdAt', width: 20 },
        { header: '서브페이지 제목', key: 'subpageTitle', width: 30 },
        { header: '슬러그', key: 'subpageSlug', width: 25 },
        { header: '평가', key: 'rating', width: 8 },
        { header: '긍정 이유', key: 'positiveReasons', width: 40 },
        { header: '자유 의견', key: 'comment', width: 80 },
        { header: 'IP 해시', key: 'ipAddressHash', width: 30 },
        { header: 'User Agent', key: 'userAgent', width: 50 },
      ];

      sheet.getRow(1).font = { bold: true };
      sheet.views = [{ state: 'frozen', ySplit: 1 }];
      sheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: sheet.columns.length },
      };

      for (const item of items) {
        const reasons = (item.positiveReasons as FeedbackPositiveReason[]).map(
          (code) => FEEDBACK_POSITIVE_REASONS[code] ?? code,
        );

        sheet.addRow({
          createdAt: formatKstDateTime(item.createdAt),
          subpageTitle: item.subpage.title,
          subpageSlug: item.subpage.slug,
          rating: item.rating === 'POSITIVE' ? '긍정' : '부정',
          positiveReasons: reasons.join(', '),
          comment: item.comment ?? '',
          ipAddressHash: item.ipAddressHash ?? '',
          userAgent: item.userAgent ?? '',
        });
      }

      const buffer = await workbook.xlsx.writeBuffer();

      // PII(IP 해시 + UA)가 외부로 반출되므로 내보내기 자체를 감사 로그에 남긴다.
      // AuditAction enum에 READ가 없어 'CREATE'로 기록 — "내보내기 산출물이 생성됨"의 의미.
      logAuditEvent({
        action: 'CREATE',
        entityType: 'SUBPAGE_FEEDBACK',
        entityTitle: '사용자 피드백 내보내기',
        changes: {
          after: {
            exportRange: { from: fromKey, to: toKey },
            filters: {
              rating,
              subpageId: subpageId ?? null,
              q: q ?? null,
            },
            totalRows: items.length,
          },
        },
        userId: ctx.user.id,
        ipAddress: ctx.auditCtx.ipAddress,
        userAgent: ctx.auditCtx.userAgent,
      });

      return new NextResponse(buffer as ArrayBuffer, {
        status: 200,
        headers: {
          'Content-Type':
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="subpage-feedback-${fromKey}-${toKey}.xlsx"`,
          'X-Row-Count': String(items.length),
        },
      });
    } catch (err) {
      console.error('[SubpageFeedback Export] Unexpected error:', err);
      return NextResponse.json(
        { success: false, error: '피드백 내보내기에 실패했습니다.' },
        { status: 500 },
      );
    }
  },
);
