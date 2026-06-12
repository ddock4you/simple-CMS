import { NextResponse } from 'next/server';

import type { z } from 'zod';

import { prisma, logAuditEvent } from '@simple-cms/db';

import { reorderBlocksSchema } from '@/features/block-management/model/blockSchemas';
import { recalculateSubpageContent } from '@/shared/lib/blockContentRecalculation';
import { defineRoute } from '@/entities/auth/lib/defineRoute';

export const PATCH = defineRoute<z.infer<typeof reorderBlocksSchema>, null>({
  resource: 'subpages',
  action: 'update',
  schema: reorderBlocksSchema,
  handler: async ({ user, parsed, params, auditCtx }) => {
    const subpageId = params.id;

    const subpage = await prisma.subpage.findFirst({
      where: { id: subpageId },
      select: { id: true, title: true },
    });
    if (!subpage) {
      return NextResponse.json(
        { success: false, error: '서브페이지를 찾을 수 없습니다.' },
        { status: 404 },
      );
    }

    const { blocks } = parsed;

    const ids = blocks.map((b) => b.id);
    const existing = await prisma.pageBlock.findMany({
      where: { id: { in: ids }, subpageId },
      select: { id: true },
    });
    if (existing.length !== ids.length) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 블록이 포함되어 있습니다.' },
        { status: 400 },
      );
    }

    await prisma.$transaction(
      blocks.map((b) =>
        prisma.pageBlock.update({
          where: { id: b.id },
          data: { displayOrder: b.displayOrder },
        }),
      ),
    );

    await recalculateSubpageContent(subpageId);

    void logAuditEvent({
      action: 'UPDATE',
      entityType: 'PAGE_BLOCK',
      entityTitle: `${subpage.title} — 블록 순서 변경`,
      changes: {
        after: { reorderedBlocks: `${blocks.length}건` },
      },
      userId: user.id,
      ipAddress: auditCtx.ipAddress,
      userAgent: auditCtx.userAgent,
    });

    return null;
  },
});
