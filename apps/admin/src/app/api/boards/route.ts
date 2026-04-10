import { NextResponse } from 'next/server';

import { prisma, logAuditEvent } from '@simple-cms/db';
import type { ApiResponse, PaginatedResponse } from '@simple-cms/types';
import { generateSlug } from '@simple-cms/editor';

import { requirePermission } from '@/entities/auth/lib/requirePermission';
import { getAuditContext } from '@/shared/lib/auditHelpers';
import {
  boardListQuerySchema,
  createBoardSchema,
} from '@/features/board-management/model/boardSchemas';
import type { BoardListItem } from '@/features/board-management/model/boardFilters';

export async function GET(request: Request): Promise<NextResponse> {
  const { error } = await requirePermission('boards', 'read');
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const parsed = boardListQuerySchema.safeParse({
      visibility: searchParams.get('visibility') ?? undefined,
      page: searchParams.get('page') ?? undefined,
      pageSize: searchParams.get('pageSize') ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: '잘못된 요청입니다.' } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const { visibility, page, pageSize } = parsed.data;
    const where =
      visibility === 'ALL'
        ? {}
        : { isPublic: visibility === 'PUBLIC' };

    const [items, total] = await Promise.all([
      prisma.board.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          skinType: true,
          isPublic: true,
          displayOrder: true,
          updatedAt: true,
          _count: { select: { posts: true } },
        },
        orderBy: [{ displayOrder: 'asc' }, { updatedAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.board.count({ where }),
    ]);

    const data = {
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        slug: item.slug,
        skinType: item.skinType,
        isPublic: item.isPublic,
        displayOrder: item.displayOrder,
        postCount: item._count.posts,
        updatedAt: item.updatedAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    };

    return NextResponse.json(
      { success: true, data } satisfies ApiResponse<PaginatedResponse<BoardListItem>>,
    );
  } catch (err) {
    console.error('[Boards GET] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: '게시판 목록 조회에 실패했습니다.' } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const { user, error } = await requirePermission('boards', 'create');
  if (error) return error;

  try {
    const body = await request.json();
    const parsed = createBoardSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const { name, description, skinType, isPublic } = parsed.data;
    const slug = parsed.data.slug?.trim() || generateSlug(name);

    if (!slug) {
      return NextResponse.json(
        { success: false, error: 'slug을 입력해주세요.' } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const existing = await prisma.board.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: '이미 사용 중인 slug입니다.' } satisfies ApiResponse<never>,
        { status: 409 },
      );
    }

    const maxOrder = await prisma.board.aggregate({
      _max: { displayOrder: true },
    });
    const displayOrder = (maxOrder._max.displayOrder ?? -1) + 1;

    const board = await prisma.board.create({
      data: {
        name,
        slug,
        description,
        skinType,
        isPublic,
        displayOrder,
      },
    });

    const auditContext = getAuditContext(request);
    logAuditEvent({
      action: 'CREATE',
      entityType: 'BOARD',
      entityId: board.id,
      entityTitle: name,
      changes: { after: { name, slug, skinType, isPublic: String(isPublic) } },
      userId: user!.id,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
    });

    return NextResponse.json(
      { success: true, data: { id: board.id } } satisfies ApiResponse<{ id: string }>,
      { status: 201 },
    );
  } catch (err) {
    console.error('[Boards POST] Unexpected error:', err);
    const message =
      err instanceof Error ? err.message : '게시판 생성에 실패했습니다.';
    return NextResponse.json(
      { success: false, error: message } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
