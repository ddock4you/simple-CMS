import { NextResponse } from 'next/server';

import { prisma, logAuditEvent } from '@simple-cms/db';
import type { ApiResponse } from '@simple-cms/types';
import { extractTextFromTiptap } from '@simple-cms/editor';

import { requirePermission } from '@/entities/auth/lib/requirePermission';
import { getAuditContext } from '@/shared/lib/auditHelpers';
import { updatePostSchema } from '@/features/post-management/model/postSchemas';
import type { PostDetail } from '@/features/post-management/model/postFilters';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { error } = await requirePermission('posts', 'read');
  if (error) return error;

  try {
    const { id } = await params;
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

    const data: PostDetail = {
      id: post.id,
      title: post.title,
      slug: post.slug,
      boardId: post.board.id,
      boardName: post.board.name,
      boardSlug: post.board.slug,
      contentJson: post.contentJson,
      status: post.status,
      authorId: post.author?.id ?? null,
      authorName: post.author?.name ?? null,
      publishedAt: post.publishedAt?.toISOString() ?? null,
      displayOrder: post.displayOrder,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    };

    return NextResponse.json(
      { success: true, data } satisfies ApiResponse<PostDetail>,
    );
  } catch (err) {
    console.error('[Posts GET detail] Unexpected error:', err);
    const message =
      err instanceof Error ? err.message : '게시글 조회에 실패했습니다.';
    return NextResponse.json(
      { success: false, error: message } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { user, error } = await requirePermission('posts', 'update');
  if (error) return error;

  try {
    const { id } = await params;
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) {
      return NextResponse.json(
        { success: false, error: '게시글을 찾을 수 없습니다.' } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    const body = await request.json();
    const parsed = updatePostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const { title, slug, boardId, contentJson, status } = parsed.data;

    // Validate board if changing
    if (boardId && boardId !== post.boardId) {
      const board = await prisma.board.findUnique({ where: { id: boardId } });
      if (!board) {
        return NextResponse.json(
          { success: false, error: '게시판을 찾을 수 없습니다.' } satisfies ApiResponse<never>,
          { status: 400 },
        );
      }
    }

    // Per-board slug uniqueness check
    const targetBoardId = boardId ?? post.boardId;
    const targetSlug = slug ?? post.slug;
    if (targetBoardId !== post.boardId || targetSlug !== post.slug) {
      const existing = await prisma.post.findUnique({
        where: { boardId_slug: { boardId: targetBoardId, slug: targetSlug } },
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

    const updated = await prisma.post.update({
      where: { id },
      data: updateData,
    });

    const before: Record<string, string | null> = {};
    const after: Record<string, string | null> = {};
    if (title !== undefined && title !== post.title) {
      before.title = post.title;
      after.title = title;
    }
    if (slug !== undefined && slug !== post.slug) {
      before.slug = post.slug;
      after.slug = slug;
    }
    if (boardId !== undefined && boardId !== post.boardId) {
      before.boardId = post.boardId;
      after.boardId = boardId;
    }
    if (status !== undefined && status !== post.status) {
      before.status = post.status;
      after.status = status;
    }

    if (Object.keys(after).length > 0) {
      const auditContext = getAuditContext(request);
      logAuditEvent({
        action: 'UPDATE',
        entityType: 'POST',
        entityId: id,
        entityTitle: updated.title,
        changes: { before, after },
        userId: user!.id,
        ipAddress: auditContext.ipAddress,
        userAgent: auditContext.userAgent,
      });
    }

    return NextResponse.json(
      { success: true, data: null } satisfies ApiResponse<null>,
    );
  } catch (err) {
    console.error('[Posts PATCH] Unexpected error:', err);
    const message =
      err instanceof Error ? err.message : '게시글 수정에 실패했습니다.';
    return NextResponse.json(
      { success: false, error: message } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { user, error } = await requirePermission('posts', 'delete');
  if (error) return error;

  try {
    const { id } = await params;
    const post = await prisma.post.findUnique({ where: { id } });

    if (!post) {
      return NextResponse.json(
        { success: false, error: '게시글을 찾을 수 없습니다.' } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    await prisma.post.delete({ where: { id } });

    // Renormalize displayOrder
    const remaining = await prisma.post.findMany({
      select: { id: true },
      orderBy: [{ displayOrder: 'asc' }, { updatedAt: 'desc' }],
    });
    for (let i = 0; i < remaining.length; i++) {
      await prisma.post.update({
        where: { id: remaining[i].id },
        data: { displayOrder: i },
      });
    }

    const auditContext = getAuditContext(request);
    logAuditEvent({
      action: 'DELETE',
      entityType: 'POST',
      entityId: id,
      entityTitle: post.title,
      changes: { before: { title: post.title, slug: post.slug, boardId: post.boardId } },
      userId: user!.id,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
    });

    return NextResponse.json(
      { success: true, data: null } satisfies ApiResponse<null>,
    );
  } catch (err) {
    console.error('[Posts DELETE] Unexpected error:', err);
    const message =
      err instanceof Error ? err.message : '게시글 삭제에 실패했습니다.';
    return NextResponse.json(
      { success: false, error: message } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
