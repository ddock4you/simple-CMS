import { NextResponse } from 'next/server';

import { z } from 'zod';

import {
  prisma,
  logAuditEvent,
  createSubpageVersionSnapshot,
} from '@simple-cms/db';
import type { Prisma, SubpageVersionSource } from '@simple-cms/db';
import type {
  SubpageVersionListItem,
  SubpageVersionListResponse,
} from '@simple-cms/types';
import { SUBPAGE_VERSION_LABEL_MAX_LENGTH } from '@simple-cms/types';

import { defineRoute } from '@/shared/api/defineRoute';

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
  authorId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  pinnedOnly: z.enum(['true', 'false']).optional(),
  source: z.enum(['MANUAL', 'AUTO_PUBLISH', 'PRE_ROLLBACK']).optional(),
});

const createSchema = z.object({
  label: z
    .string()
    .max(
      SUBPAGE_VERSION_LABEL_MAX_LENGTH,
      `메모는 ${SUBPAGE_VERSION_LABEL_MAX_LENGTH.toLocaleString()}자 이내여야 합니다.`,
    )
    .optional()
    .nullable(),
});

function toListItem(v: {
  id: string;
  subpageId: string;
  createdAt: Date;
  createdBy: { id: string; username: string; name: string } | null;
  label: string | null;
  sourceAction: SubpageVersionSource;
  isPinned: boolean;
}): SubpageVersionListItem {
  return {
    id: v.id,
    subpageId: v.subpageId,
    createdAt: v.createdAt.toISOString(),
    createdBy: v.createdBy,
    label: v.label,
    sourceAction: v.sourceAction,
    isPinned: v.isPinned,
  };
}

export const GET = defineRoute<undefined, SubpageVersionListResponse>({
  resource: 'subpages',
  action: 'read',
  handler: async ({ request, params }) => {
    const subpageId = params.id;
    const url = new URL(request.url);
    const queryParsed = listQuerySchema.safeParse({
      page: url.searchParams.get('page') ?? undefined,
      pageSize: url.searchParams.get('pageSize') ?? undefined,
      authorId: url.searchParams.get('authorId') ?? undefined,
      from: url.searchParams.get('from') ?? undefined,
      to: url.searchParams.get('to') ?? undefined,
      pinnedOnly: url.searchParams.get('pinnedOnly') ?? undefined,
      source: url.searchParams.get('source') ?? undefined,
    });
    if (!queryParsed.success) {
      return NextResponse.json(
        { success: false, error: queryParsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const subpage = await prisma.subpage.findFirst({
      where: { id: subpageId },
      select: { id: true },
    });
    if (!subpage) {
      return NextResponse.json(
        { success: false, error: '서브페이지를 찾을 수 없습니다.' },
        { status: 404 },
      );
    }

    const { page, pageSize, authorId, from, to, pinnedOnly, source } = queryParsed.data;

    const where: Prisma.SubpageVersionWhereInput = { subpageId };
    if (authorId) where.createdById = authorId;
    if (from || to) {
      const gte = from ? new Date(from) : undefined;
      const lte = to ? new Date(to) : undefined;
      where.createdAt = {
        ...(gte && !Number.isNaN(gte.getTime()) ? { gte } : {}),
        ...(lte && !Number.isNaN(lte.getTime()) ? { lte } : {}),
      };
    }
    if (pinnedOnly === 'true') where.isPinned = true;
    if (source) where.sourceAction = source;

    const [total, items] = await Promise.all([
      prisma.subpageVersion.count({ where }),
      prisma.subpageVersion.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          createdBy: { select: { id: true, username: true, name: true } },
        },
      }),
    ]);

    return {
      items: items.map(toListItem),
      total,
      page,
      pageSize,
    };
  },
});

export const POST = defineRoute<z.infer<typeof createSchema>, null>({
  resource: 'subpages',
  action: 'update',
  schema: createSchema,
  handler: async ({ user, parsed, params, auditCtx }) => {
    const subpageId = params.id;

    const subpage = await prisma.subpage.findFirst({
      where: { id: subpageId },
      select: { id: true, title: true },
    });
    if (!subpage) {
      return NextResponse.json(
        { success: false, error: '서브페이지를 찾을 수 없습니다.' },
        { status: 404 },
      );
    }

    const version = await createSubpageVersionSnapshot({
      subpageId,
      createdById: user.id,
      label: parsed.label ?? null,
      sourceAction: 'MANUAL',
    });

    void logAuditEvent({
      action: 'CREATE',
      entityType: 'SUBPAGE_VERSION',
      entityId: version.id,
      entityTitle: `${subpage.title} — 버전 저장`,
      changes: {
        after: {
          versionId: version.id,
          label: version.label,
          sourceAction: 'MANUAL',
        },
      },
      userId: user.id,
      ipAddress: auditCtx.ipAddress,
      userAgent: auditCtx.userAgent,
    });

    return NextResponse.json(
      { success: true, data: { id: version.id } },
      { status: 201 },
    );
  },
});
