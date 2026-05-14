import { NextResponse } from 'next/server';

import { prisma } from '@simple-cms/db';
import type { ApiResponse } from '@simple-cms/types';

import { defineRoute } from '@/shared/api/defineRoute';
import { renormalizeDisplayOrder } from '@/shared/api/renormalizeDisplayOrder';
import { updateBoardSchema } from '@/features/board-management/model/boardSchemas';
import type { UpdateBoardData } from '@/features/board-management/model/boardSchemas';
import { buildBoardPatchDiff } from '@/features/board-management/lib/buildBoardPatchDiff';
import type { BoardDetail } from '@/features/board-management/model/boardFilters';

export const GET = defineRoute<undefined, BoardDetail>({
  resource: 'boards',
  action: 'read',
  handler: async ({ params }) => {
    const { id } = params;
    const board = await prisma.board.findUnique({
      where: { id },
      include: { _count: { select: { posts: true } } },
    });

    if (!board) {
      return NextResponse.json(
        { success: false, error: '게시판을 찾을 수 없습니다.' } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    return {
      id: board.id,
      name: board.name,
      slug: board.slug,
      description: board.description,
      skinType: board.skinType,
      isPublic: board.isPublic,
      displayOrder: board.displayOrder,
      postCount: board._count.posts,
      createdAt: board.createdAt.toISOString(),
      updatedAt: board.updatedAt.toISOString(),
    } satisfies BoardDetail;
  },
});

type PatchResult = {
  updatedName: string;
  before: Record<string, string | null>;
  after: Record<string, string | null>;
};

export const PATCH = defineRoute<UpdateBoardData, PatchResult>({
  resource: 'boards',
  action: 'update',
  schema: updateBoardSchema,
  handler: async ({ parsed, params }) => {
    const { id } = params;
    const board = await prisma.board.findUnique({ where: { id } });
    if (!board) {
      return NextResponse.json(
        { success: false, error: '게시판을 찾을 수 없습니다.' } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    const { name, slug, description, skinType, isPublic } = parsed;

    if (slug && slug !== board.slug) {
      const existing = await prisma.board.findFirst({ where: { slug } });
      if (existing) {
        return NextResponse.json(
          { success: false, error: '이미 사용 중인 slug입니다.' } satisfies ApiResponse<never>,
          { status: 409 },
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug;
    if (description !== undefined) updateData.description = description;
    if (skinType !== undefined) updateData.skinType = skinType;
    if (isPublic !== undefined) updateData.isPublic = isPublic;

    const updated = await prisma.board.update({ where: { id }, data: updateData });
    const { before, after } = buildBoardPatchDiff(parsed, board);

    return { updatedName: updated.name, before, after };
  },
  responseData: () => null,
  audit: {
    build: (result, ctx) => {
      if (Object.keys(result.after).length === 0) return null;
      return {
        action: 'UPDATE',
        entityType: 'BOARD',
        entityId: ctx.params.id,
        entityTitle: result.updatedName,
        changes: { before: result.before, after: result.after },
      };
    },
  },
});

type DeleteResult = { name: string; slug: string; skinType: string };

export const DELETE = defineRoute<undefined, DeleteResult>({
  resource: 'boards',
  action: 'delete',
  handler: async ({ params }) => {
    const { id } = params;
    const board = await prisma.board.findUnique({
      where: { id },
      include: { _count: { select: { posts: true, navigationMenuItems: true } } },
    });

    if (!board) {
      return NextResponse.json(
        { success: false, error: '게시판을 찾을 수 없습니다.' } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    if (board._count.posts > 0) {
      return NextResponse.json(
        {
          success: false,
          error: '이 게시판에 게시글이 있습니다. 먼저 게시글을 삭제해주세요.',
        } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    if (board._count.navigationMenuItems > 0) {
      return NextResponse.json(
        {
          success: false,
          error: '이 게시판을 참조하는 메뉴 항목이 있습니다. 먼저 메뉴 연결을 해제해주세요.',
        } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    await prisma.board.delete({ where: { id } });
    await renormalizeDisplayOrder({ model: 'board' });

    return { name: board.name, slug: board.slug, skinType: board.skinType };
  },
  responseData: () => null,
  audit: {
    build: (result, ctx) => ({
      action: 'DELETE',
      entityType: 'BOARD',
      entityId: ctx.params.id,
      entityTitle: result.name,
      changes: { before: { name: result.name, slug: result.slug, skinType: result.skinType } },
    }),
  },
});
