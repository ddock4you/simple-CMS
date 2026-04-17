import { NextResponse } from 'next/server';
import { z } from 'zod';

import { logAuditEvent, prisma } from '@simple-cms/db';
import type { ApiResponse } from '@simple-cms/types';

import { requirePermission } from '@/entities/auth/lib/requirePermission';
import { getAuditContext } from '@/shared/lib/auditHelpers';

const bulkStatusSchema = z.object({
  ids: z
    .array(z.string().min(1))
    .min(1, '대상을 선택해주세요.')
    .max(200, '한 번에 최대 200개까지 처리할 수 있습니다.'),
  status: z.enum(['DRAFT', 'PUBLISHED']),
});

interface FailedItem {
  id: string;
  reason: string;
}

interface BulkStatusResponse {
  updated: string[];
  failed: FailedItem[];
}

export async function POST(request: Request): Promise<NextResponse> {
  const { user, error } = await requirePermission('subpages', 'update');
  if (error) return error;

  try {
    const body = await request.json();
    const parsed = bulkStatusSchema.safeParse(body);
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
    const { status } = parsed.data;

    const subpages = await prisma.subpage.findMany({
      where: { id: { in: ids } },
    });

    const auditContext = getAuditContext(request);
    const updated: string[] = [];
    const failed: FailedItem[] = [];

    for (const subpage of subpages) {
      if (subpage.status === status) {
        continue; // skip — 이미 같은 상태
      }

      const updateData: Record<string, unknown> = { status };
      if (status === 'PUBLISHED' && subpage.status === 'DRAFT') {
        updateData.publishedAt = new Date();
      }

      try {
        await prisma.subpage.update({
          where: { id: subpage.id },
          data: updateData,
        });

        logAuditEvent({
          action: 'UPDATE',
          entityType: 'SUBPAGE',
          entityId: subpage.id,
          entityTitle: `${subpage.title} (상태 변경)`,
          changes: {
            before: { status: subpage.status },
            after: { status },
          },
          userId: user!.id,
          ipAddress: auditContext.ipAddress,
          userAgent: auditContext.userAgent,
        });

        updated.push(subpage.id);
      } catch (e) {
        failed.push({
          id: subpage.id,
          reason: e instanceof Error ? e.message : '알 수 없는 오류',
        });
      }
    }

    const data: BulkStatusResponse = { updated, failed };
    return NextResponse.json(
      { success: true, data } satisfies ApiResponse<BulkStatusResponse>,
    );
  } catch (err) {
    console.error('[Subpages bulk-status] Unexpected error:', err);
    const message =
      err instanceof Error ? err.message : '일괄 상태 변경에 실패했습니다.';
    return NextResponse.json(
      { success: false, error: message } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
