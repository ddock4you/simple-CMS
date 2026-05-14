import { NextResponse } from 'next/server';
import type { z } from 'zod';

import { prisma, logAuditEvent } from '@simple-cms/db';
import type { ApiResponse, PaginatedResponse } from '@simple-cms/types';
import { extractTextFromTiptap, generateSlug } from '@simple-cms/editor';

import { defineRoute } from '@/shared/api/defineRoute';
import {
  postListQuerySchema,
  createPostSchema,
} from '@/features/post-management/model/postSchemas';
import type { PostListItem } from '@/features/post-management/model/postFilters';

export const GET = defineRoute<undefined, PaginatedResponse<PostListItem>>({
  resource: 'posts',
  action: 'read',
  handler: async ({ request }) => {
    const { searchParams } = new URL(request.url);
    const parsed = postListQuerySchema.safeParse({
      status: searchParams.get('status') ?? undefined,
      boardId: searchParams.get('boardId') ?? undefined,
      page: searchParams.get('page') ?? undefined,
      pageSize: searchParams.get('pageSize') ?? undefined,
      q: searchParams.get('q') ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: '잘못된 요청입니다.' } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const { status, boardId, page, pageSize, q } = parsed.data;
    const where = {
      ...(status !== 'ALL' ? { status: status as 'DRAFT' | 'PUBLISHED' } : {}),
      ...(boardId ? { boardId } : {}),
      ...(q ? { title: { contains: q, mode: 'insensitive' as const } } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.post.findMany({
        where,
        select: {
          id: true,
          title: true,
          slug: true,
          boardId: true,
          status: true,
          publishedAt: true,
          updatedAt: true,
          board: { select: { name: true } },
          author: { select: { name: true } },
        },
        orderBy: [{ updatedAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.post.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        id: item.id,
        title: item.title,
        slug: item.slug,
        boardId: item.boardId,
        boardName: item.board.name,
        status: item.status,
        authorName: item.author?.name ?? null,
        publishedAt: item.publishedAt?.toISOString() ?? null,
        updatedAt: item.updatedAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    };
  },
});

export const POST = defineRoute<z.infer<typeof createPostSchema>, null>({
  resource: 'posts',
  action: 'create',
  schema: createPostSchema,
  handler: async ({ user, parsed, auditCtx }) => {
    const { title, boardId, seoTitle, seoDescription, contentJson, status } = parsed;

    const board = await prisma.board.findUnique({ where: { id: boardId } });
    if (!board) {
      return NextResponse.json(
        { success: false, error: '게시판을 찾을 수 없습니다.' } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const slug = parsed.slug?.trim() || generateSlug(title);
    if (!slug) {
      return NextResponse.json(
        { success: false, error: 'slug을 입력해주세요.' } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const existing = await prisma.post.findFirst({ where: { boardId, slug } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: '이 게시판에서 이미 사용 중인 slug입니다.' } satisfies ApiResponse<never>,
        { status: 409 },
      );
    }

    const maxOrder = await prisma.post.aggregate({ _max: { displayOrder: true } });
    const displayOrder = (maxOrder._max.displayOrder ?? -1) + 1;

    const content = contentJson ? extractTextFromTiptap(contentJson) : null;
    const publishedAt = status === 'PUBLISHED' ? new Date() : null;
    const normalizedSeoTitle = seoTitle?.trim() || null;
    const normalizedSeoDescription = seoDescription?.trim() || null;

    const post = await prisma.post.create({
      data: {
        title,
        slug,
        boardId,
        seoTitle: normalizedSeoTitle,
        seoDescription: normalizedSeoDescription,
        contentJson: contentJson ?? undefined,
        content,
        status,
        publishedAt,
        displayOrder,
        authorId: user.id,
      },
    });

    void logAuditEvent({
      action: 'CREATE',
      entityType: 'POST',
      entityId: post.id,
      entityTitle: title,
      changes: {
        after: {
          title,
          slug,
          boardId,
          status,
          seoTitle: normalizedSeoTitle,
          seoDescription: normalizedSeoDescription,
        },
      },
      userId: user.id,
      ipAddress: auditCtx.ipAddress,
      userAgent: auditCtx.userAgent,
    });

    return NextResponse.json(
      { success: true, data: { id: post.id } } satisfies ApiResponse<{ id: string }>,
      { status: 201 },
    );
  },
});
