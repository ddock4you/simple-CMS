import { NextResponse } from 'next/server';

import { prisma, logAuditEvent } from '@simple-cms/db';
import type { ApiResponse } from '@simple-cms/types';

import { requirePermission } from '@/entities/auth/lib/requirePermission';
import { getAuditContext } from '@/shared/lib/auditHelpers';
import { updateBoardSchema } from '@/features/board-management/model/boardSchemas';
import type { BoardDetail } from '@/features/board-management/model/boardFilters';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { error } = await requirePermission('boards', 'read');
  if (error) return error;

  try {
    const { id } = await params;
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

    const data: BoardDetail = {
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
    };

    return NextResponse.json(
      { success: true, data } satisfies ApiResponse<BoardDetail>,
    );
  } catch (err) {
    console.error('[Boards GET detail] Unexpected error:', err);
    const message =
      err instanceof Error ? err.message : '게시판 조회에 실패했습니다.';
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
  const { user, error } = await requirePermission('boards', 'update');
  if (error) return error;

  try {
    const { id } = await params;
    const board = await prisma.board.findUnique({ where: { id } });
    if (!board) {
      return NextResponse.json(
        { success: false, error: '게시판을 찾을 수 없습니다.' } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    const body = await request.json();
    const parsed = updateBoardSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const { name, slug, description, skinType, isPublic } = parsed.data;

    if (slug && slug !== board.slug) {
      const existing = await prisma.board.findUnique({ where: { slug } });
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

    const updated = await prisma.board.update({
      where: { id },
      data: updateData,
    });

    const before: Record<string, string> = {};
    const after: Record<string, string> = {};
    if (name !== undefined && name !== board.name) {
      before.name = board.name;
      after.name = name;
    }
    if (slug !== undefined && slug !== board.slug) {
      before.slug = board.slug;
      after.slug = slug;
    }
    if (skinType !== undefined && skinType !== board.skinType) {
      before.skinType = board.skinType;
      after.skinType = skinType;
    }
    if (isPublic !== undefined && isPublic !== board.isPublic) {
      before.isPublic = String(board.isPublic);
      after.isPublic = String(isPublic);
    }
    if (description !== undefined && description !== board.description) {
      before.description = board.description ?? '';
      after.description = description ?? '';
    }

    if (Object.keys(after).length > 0) {
      const auditContext = getAuditContext(request);
      logAuditEvent({
        action: 'UPDATE',
        entityType: 'BOARD',
        entityId: id,
        entityTitle: updated.name,
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
    console.error('[Boards PATCH] Unexpected error:', err);
    const message =
      err instanceof Error ? err.message : '게시판 수정에 실패했습니다.';
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
  const { user, error } = await requirePermission('boards', 'delete');
  if (error) return error;

  try {
    const { id } = await params;
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
          error:
            '이 게시판을 참조하는 메뉴 항목이 있습니다. 먼저 메뉴 연결을 해제해주세요.',
        } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    await prisma.board.delete({ where: { id } });

    // Renormalize displayOrder
    const remaining = await prisma.board.findMany({
      select: { id: true },
      orderBy: [{ displayOrder: 'asc' }, { updatedAt: 'desc' }],
    });
    for (let i = 0; i < remaining.length; i++) {
      await prisma.board.update({
        where: { id: remaining[i].id },
        data: { displayOrder: i },
      });
    }

    const auditContext = getAuditContext(request);
    logAuditEvent({
      action: 'DELETE',
      entityType: 'BOARD',
      entityId: id,
      entityTitle: board.name,
      changes: {
        before: { name: board.name, slug: board.slug, skinType: board.skinType },
      },
      userId: user!.id,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
    });

    return NextResponse.json(
      { success: true, data: null } satisfies ApiResponse<null>,
    );
  } catch (err) {
    console.error('[Boards DELETE] Unexpected error:', err);
    const message =
      err instanceof Error ? err.message : '게시판 삭제에 실패했습니다.';
    return NextResponse.json(
      { success: false, error: message } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
