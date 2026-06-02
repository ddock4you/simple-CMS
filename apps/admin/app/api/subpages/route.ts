import { NextResponse } from 'next/server';

import { prisma, logAuditEvent } from '@simple-cms/db';
import type { ApiResponse, PaginatedResponse } from '@simple-cms/types';
import type { z } from 'zod';

import { createSubpageSchema, subpageListQuerySchema } from '@/features/subpage-management/model/subpageSchemas';
import type { SubpageListItem } from '@/features/subpage-management/model/subpageFilters';
import { defineRoute } from '@/shared/api/defineRoute';
import { createUniqueSubpageSlug } from '@/shared/lib/opaqueSlug';

export const GET = defineRoute<undefined, PaginatedResponse<SubpageListItem>>({
  resource: 'subpages',
  action: 'read',
  handler: async ({ request }) => {
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

    return {
      items: items.map((item) => ({
        ...item,
        publishedAt: item.publishedAt?.toISOString() ?? null,
        updatedAt: item.updatedAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    };
  },
});

export const POST = defineRoute<z.infer<typeof createSubpageSchema>, null>({
  resource: 'subpages',
  action: 'create',
  schema: createSubpageSchema,
  handler: async ({ user, parsed, auditCtx }) => {
    const { title, seoTitle, seoDescription, status, cclType, cclAi, feedbackEnabled } = parsed;
    const slug = await createUniqueSubpageSlug();

    const maxOrder = await prisma.subpage.aggregate({ _max: { displayOrder: true } });
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

    void logAuditEvent({
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
      userId: user.id,
      ipAddress: auditCtx.ipAddress,
      userAgent: auditCtx.userAgent,
    });

    return NextResponse.json(
      { success: true, data: { id: subpage.id } } satisfies ApiResponse<{ id: string }>,
      { status: 201 },
    );
  },
});
