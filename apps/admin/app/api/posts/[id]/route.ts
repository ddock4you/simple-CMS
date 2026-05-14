import { NextResponse } from 'next/server';
import type { z } from 'zod';

import { prisma } from '@simple-cms/db';
import type { ApiResponse } from '@simple-cms/types';
import { extractTextFromTiptap } from '@simple-cms/editor';

import { defineRoute } from '@/shared/api/defineRoute';
import { renormalizeDisplayOrder } from '@/shared/api/renormalizeDisplayOrder';
import { updatePostSchema } from '@/features/post-management/model/postSchemas';
import { buildPostPatchDiff } from '@/features/post-management/lib/buildPostPatchDiff';
import type { PostDetail } from '@/features/post-management/model/postFilters';

export const GET = defineRoute<undefined, PostDetail>({
  resource: 'posts',
  action: 'read',
  handler: async ({ params }) => {
    const { id } = params;
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        board: { select: { id: true, name: true, slug: true } },
        author: { select: { id: true, name: true } },
      },
    });

    if (!post) {
      return NextResponse.json(
        { success: false, error: '게시글을 찾을 수 없습니다.' } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    return {
      id: post.id,
      title: post.title,
      slug: post.slug,
      boardId: post.board.id,
      boardName: post.board.name,
      boardSlug: post.board.slug,
      seoTitle: post.seoTitle,
      seoDescription: post.seoDescription,
      contentJson: post.contentJson,
      status: post.status,
      authorId: post.author?.id ?? null,
      authorName: post.author?.name ?? null,
      publishedAt: post.publishedAt?.toISOString() ?? null,
      displayOrder: post.displayOrder,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    } satisfies PostDetail;
  },
});

type PatchResult = {
  updatedTitle: string;
  before: Record<string, string | null>;
  after: Record<string, string | null>;
};

export const PATCH = defineRoute<z.infer<typeof updatePostSchema>, PatchResult>({
  resource: 'posts',
  action: 'update',
  schema: updatePostSchema,
  handler: async ({ parsed, params }) => {
    const { id } = params;
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) {
      return NextResponse.json(
        { success: false, error: '게시글을 찾을 수 없습니다.' } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    const { title, slug, boardId, seoTitle, seoDescription, contentJson, status } = parsed;

    if (boardId && boardId !== post.boardId) {
      const board = await prisma.board.findUnique({ where: { id: boardId } });
      if (!board) {
        return NextResponse.json(
          { success: false, error: '게시판을 찾을 수 없습니다.' } satisfies ApiResponse<never>,
          { status: 400 },
        );
      }
    }

    const targetBoardId = boardId ?? post.boardId;
    const targetSlug = slug ?? post.slug;
    if (targetBoardId !== post.boardId || targetSlug !== post.slug) {
      const existing = await prisma.post.findFirst({
        where: { boardId: targetBoardId, slug: targetSlug },
      });
      if (existing && existing.id !== id) {
        return NextResponse.json(
          { success: false, error: '이 게시판에서 이미 사용 중인 slug입니다.' } satisfies ApiResponse<never>,
          { status: 409 },
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (slug !== undefined) updateData.slug = slug;
    if (boardId !== undefined) updateData.boardId = boardId;
    if (seoTitle !== undefined) updateData.seoTitle = seoTitle?.trim() || null;
    if (seoDescription !== undefined) updateData.seoDescription = seoDescription?.trim() || null;
    if (contentJson !== undefined) {
      updateData.contentJson = contentJson;
      updateData.content = extractTextFromTiptap(contentJson);
    }
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'PUBLISHED' && post.status === 'DRAFT') {
        updateData.publishedAt = new Date();
      }
    }

    const updated = await prisma.post.update({ where: { id }, data: updateData });
    const { before, after } = buildPostPatchDiff(parsed, post);

    return { updatedTitle: updated.title, before, after };
  },
  responseData: () => null,
  audit: {
    build: (result, ctx) => {
      if (Object.keys(result.after).length === 0) return null;
      return {
        action: 'UPDATE',
        entityType: 'POST',
        entityId: ctx.params.id,
        entityTitle: result.updatedTitle,
        changes: { before: result.before, after: result.after },
      };
    },
  },
});

type DeleteResult = { title: string; slug: string; boardId: string };

export const DELETE = defineRoute<undefined, DeleteResult>({
  resource: 'posts',
  action: 'delete',
  handler: async ({ params }) => {
    const { id } = params;
    const post = await prisma.post.findUnique({ where: { id } });

    if (!post) {
      return NextResponse.json(
        { success: false, error: '게시글을 찾을 수 없습니다.' } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    await prisma.post.delete({ where: { id } });
    await renormalizeDisplayOrder({ model: 'post' });

    return { title: post.title, slug: post.slug, boardId: post.boardId };
  },
  responseData: () => null,
  audit: {
    build: (result, ctx) => ({
      action: 'DELETE',
      entityType: 'POST',
      entityId: ctx.params.id,
      entityTitle: result.title,
      changes: { before: { title: result.title, slug: result.slug, boardId: result.boardId } },
    }),
  },
});
