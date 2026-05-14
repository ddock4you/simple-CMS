import { NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@simple-cms/db';
import type { ApiResponse } from '@simple-cms/types';

import { defineRoute } from '@/shared/api/defineRoute';

const visibilitySchema = z.object({
  isPublic: z.boolean(),
});

type VisibilityResult = { name: string; before: boolean; after: boolean };

export const PATCH = defineRoute<z.infer<typeof visibilitySchema>, VisibilityResult>({
  resource: 'boards',
  action: 'update',
  schema: visibilitySchema,
  handler: async ({ parsed, params }) => {
    const { id } = params;
    const board = await prisma.board.findUnique({ where: { id } });
    if (!board) {
      return NextResponse.json(
        { success: false, error: '게시판을 찾을 수 없습니다.' } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    const { isPublic } = parsed;
    if (isPublic === board.isPublic) {
      return NextResponse.json(
        { success: true, data: null } satisfies ApiResponse<null>,
      );
    }

    const updated = await prisma.board.update({ where: { id }, data: { isPublic } });

    return { name: updated.name, before: board.isPublic, after: isPublic };
  },
  responseData: () => null,
  audit: {
    build: (result, ctx) => ({
      action: 'UPDATE',
      entityType: 'BOARD',
      entityId: ctx.params.id,
      entityTitle: `${result.name} (공개 변경)`,
      changes: {
        before: { isPublic: String(result.before) },
        after: { isPublic: String(result.after) },
      },
    }),
  },
});
