import { NextResponse } from 'next/server';

import { prisma, logAuditEvent } from '@simple-cms/db';
import type { ApiResponse, PaginatedResponse } from '@simple-cms/types';
import { generateSlug } from '@simple-cms/editor';

import { requirePermission } from '@/entities/auth/lib/requirePermission';
import { getAuditContext } from '@/shared/lib/auditHelpers';
import {
  subpageListQuerySchema,
  createSubpageSchema,
} from '@/features/subpage-management/model/subpageSchemas';
import type { SubpageListItem } from '@/features/subpage-management/model/subpageFilters';

export async function GET(request: Request): Promise<NextResponse> {
  const { error } = await requirePermission('subpages', 'read');
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const parsed = subpageListQuerySchema.safeParse({
      status: searchParams.get('status') ?? undefined,
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

    const { status, page, pageSize, q } = parsed.data;
    const statusWhere = status === 'ALL' ? {} : { status: status as 'DRAFT' | 'PUBLISHED' };
    const searchWhere = q
      ? {
          OR: [
            { title: { contains: q, mode: 'insensitive' as const } },
            { slug: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {};
    const where = { ...statusWhere, ...searchWhere };

    const [items, total] = await Promise.all([
      prisma.subpage.findMany({
        where,
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          publishedAt: true,
          displayOrder: true,
          updatedAt: true,
        },
        orderBy: [{ displayOrder: 'asc' }, { updatedAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.subpage.count({ where }),
    ]);

    const data = {
      items: items.map((item) => ({
        ...item,
        publishedAt: item.publishedAt?.toISOString() ?? null,
        updatedAt: item.updatedAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    };

    return NextResponse.json(
      { success: true, data } satisfies ApiResponse<PaginatedResponse<SubpageListItem>>,
    );
  } catch (err) {
    console.error('[Subpages GET] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: '서브 페이지 목록 조회에 실패했습니다.' } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const { user, error } = await requirePermission('subpages', 'create');
  if (error) return error;

  try {
    const body = await request.json();
    const parsed = createSubpageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const {
      title,
      seoTitle,
      seoDescription,
      status,
      cclType,
      cclAi,
      feedbackEnabled,
    } = parsed.data;
    const slug = parsed.data.slug?.trim() || generateSlug(title);

    if (!slug) {
      return NextResponse.json(
        { success: false, error: 'slug을 입력해주세요.' } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const existing = await prisma.subpage.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: '이미 사용 중인 slug입니다.' } satisfies ApiResponse<never>,
        { status: 409 },
      );
    }

    const maxOrder = await prisma.subpage.aggregate({
      _max: { displayOrder: true },
    });
    const displayOrder = (maxOrder._max.displayOrder ?? -1) + 1;

    const publishedAt = status === 'PUBLISHED' ? new Date() : null;

    // 본문은 RICH_TEXT 블록으로 별도 관리 — 서브페이지 생성 시 content는 null로 시작
    const subpage = await prisma.subpage.create({
      data: {
        title,
        slug,
        seoTitle,
        seoDescription,
        status,
        publishedAt,
        cclType: cclType ?? null,
        cclAi: cclType ? cclAi : false,
        feedbackEnabled: feedbackEnabled ?? false,
        displayOrder,
      },
    });

    const auditContext = getAuditContext(request);
    logAuditEvent({
      action: 'CREATE',
      entityType: 'SUBPAGE',
      entityId: subpage.id,
      entityTitle: title,
      changes: {
        after: {
          title,
          slug,
          status,
          cclType: subpage.cclType,
          cclAi: subpage.cclAi,
          feedbackEnabled: subpage.feedbackEnabled,
        },
      },
      userId: user!.id,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
    });

    return NextResponse.json(
      { success: true, data: { id: subpage.id } } satisfies ApiResponse<{ id: string }>,
      { status: 201 },
    );
  } catch (err) {
    console.error('[Subpages POST] Unexpected error:', err);
    const message =
      err instanceof Error ? err.message : '서브 페이지 생성에 실패했습니다.';
    return NextResponse.json(
      { success: false, error: message } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
