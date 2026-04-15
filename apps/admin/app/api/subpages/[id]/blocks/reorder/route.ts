import { NextResponse } from 'next/server';

import { prisma, logAuditEvent } from '@simple-cms/db';
import type { ApiResponse } from '@simple-cms/types';

import { requirePermission } from '@/entities/auth/lib/requirePermission';
import { getAuditContext } from '@/shared/lib/auditHelpers';
import { recalculateSubpageContent } from '@/shared/lib/blockContentRecalculation';
import { reorderBlocksSchema } from '@/features/block-management/model/blockSchemas';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { user, error } = await requirePermission('subpages', 'update');
  if (error) return error;

  try {
    const { id: subpageId } = await params;

    const subpage = await prisma.subpage.findUnique({
      where: { id: subpageId },
      select: { id: true, title: true },
    });
    if (!subpage) {
      return NextResponse.json(
        {
          success: false,
          error: '서브페이지를 찾을 수 없습니다.',
        } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    const body = await request.json();
    const parsed = reorderBlocksSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0].message,
        } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const { blocks } = parsed.data;

    // 모든 id가 해당 서브페이지 소속인지 검증 (다른 서브페이지 블록 조작 차단)
    const ids = blocks.map((b) => b.id);
    const existing = await prisma.pageBlock.findMany({
      where: { id: { in: ids }, subpageId },
      select: { id: true },
    });
    if (existing.length !== ids.length) {
      return NextResponse.json(
        {
          success: false,
          error: '유효하지 않은 블록이 포함되어 있습니다.',
        } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    // 트랜잭션으로 일괄 갱신
    await prisma.$transaction(
      blocks.map((b) =>
        prisma.pageBlock.update({
          where: { id: b.id },
          data: { displayOrder: b.displayOrder },
        }),
      ),
    );

    // 순서 변경은 RICH_TEXT 블록 간 순서를 바꿀 수 있어 검색 인덱스 재집계
    await recalculateSubpageContent(subpageId);

    const auditContext = getAuditContext(request);
    logAuditEvent({
      action: 'UPDATE',
      entityType: 'PAGE_BLOCK',
      entityTitle: `${subpage.title} — 블록 순서 변경`,
      changes: {
        after: { reorderedBlocks: `${blocks.length}건` },
      },
      userId: user!.id,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
    });

    return NextResponse.json(
      { success: true, data: null } satisfies ApiResponse<null>,
    );
  } catch (err) {
    console.error('[Blocks reorder PATCH] Unexpected error:', err);
    return NextResponse.json(
      {
        success: false,
        error: '블록 순서 변경에 실패했습니다.',
      } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
