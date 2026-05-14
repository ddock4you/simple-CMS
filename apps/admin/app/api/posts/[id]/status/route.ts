import { NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@simple-cms/db';
import type { ApiResponse } from '@simple-cms/types';

import { defineRoute } from '@/shared/api/defineRoute';

const statusSchema = z.object({
  status: z.enum(['DRAFT', 'PUBLISHED']),
});

type StatusResult = { title: string; before: string; after: string };

export const PATCH = defineRoute<z.infer<typeof statusSchema>, StatusResult>({
  resource: 'posts',
  action: 'update',
  schema: statusSchema,
  handler: async ({ parsed, params }) => {
    const { id } = params;
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) {
      return NextResponse.json(
        { success: false, error: '게시글을 찾을 수 없습니다.' } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    const { status } = parsed;
    if (status === post.status) {
      return NextResponse.json(
        { success: true, data: null } satisfies ApiResponse<null>,
      );
    }

    const updateData: Record<string, unknown> = { status };
    if (status === 'PUBLISHED' && post.status === 'DRAFT') {
      updateData.publishedAt = new Date();
    }

    const updated = await prisma.post.update({ where: { id }, data: updateData });

    return { title: updated.title, before: post.status, after: status };
  },
  responseData: () => null,
  audit: {
    build: (result, ctx) => ({
      action: 'UPDATE',
      entityType: 'POST',
      entityId: ctx.params.id,
      entityTitle: `${result.title} (상태 변경)`,
      changes: { before: { status: result.before }, after: { status: result.after } },
    }),
  },
});
