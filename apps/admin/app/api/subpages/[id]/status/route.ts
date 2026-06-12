import { NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@simple-cms/db';
import type { ApiResponse } from '@simple-cms/types';

import { defineRoute } from '@/entities/auth/lib/defineRoute';

const statusSchema = z.object({
  status: z.enum(['DRAFT', 'PUBLISHED']),
});

type StatusResult = { title: string; prevStatus: string };

export const PATCH = defineRoute<z.infer<typeof statusSchema>, StatusResult>({
  resource: 'subpages',
  action: 'update',
  schema: statusSchema,
  handler: async ({ parsed, params }) => {
    const { id } = params;
    const { status } = parsed;

    const subpage = await prisma.subpage.findUnique({
      where: { id },
      select: { title: true, status: true, publishedAt: true },
    });
    if (!subpage) {
      return NextResponse.json(
        { success: false, error: '서브 페이지를 찾을 수 없습니다.' } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    if (subpage.status === status) {
      return NextResponse.json(
        { success: true, data: null } satisfies ApiResponse<null>,
      );
    }

    const updateData: Record<string, unknown> = { status };
    if (status === 'PUBLISHED' && subpage.status === 'DRAFT') {
      updateData.publishedAt = new Date();
    }

    const updated = await prisma.subpage.update({
      where: { id },
      data: updateData,
      select: { title: true },
    });

    return { title: updated.title, prevStatus: subpage.status };
  },
  responseData: () => null,
  audit: {
    build: (result, ctx) => ({
      action: 'UPDATE',
      entityType: 'SUBPAGE',
      entityId: ctx.params.id,
      entityTitle: `${result.title} (상태 변경)`,
      changes: { before: { status: result.prevStatus }, after: { status: ctx.parsed.status } },
    }),
  },
});
