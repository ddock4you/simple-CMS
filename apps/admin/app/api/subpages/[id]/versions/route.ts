import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  prisma,
  logAuditEvent,
  createSubpageVersionSnapshot,
} from '@simple-cms/db';
import type { Prisma, SubpageVersionSource } from '@simple-cms/db';
import type {
  ApiResponse,
  SubpageVersionListItem,
  SubpageVersionListResponse,
} from '@simple-cms/types';
import { SUBPAGE_VERSION_LABEL_MAX_LENGTH } from '@simple-cms/types';

import { requirePermission } from '@/entities/auth/lib/requirePermission';
import { getAuditContext } from '@/shared/lib/auditHelpers';

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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { error } = await requirePermission('subpages', 'read');
  if (error) return error;

  try {
    const { id: subpageId } = await params;
    const url = new URL(request.url);
    const parsed = listQuerySchema.safeParse({
      page: url.searchParams.get('page') ?? undefined,
      pageSize: url.searchParams.get('pageSize') ?? undefined,
      authorId: url.searchParams.get('authorId') ?? undefined,
      from: url.searchParams.get('from') ?? undefined,
      to: url.searchParams.get('to') ?? undefined,
      pinnedOnly: url.searchParams.get('pinnedOnly') ?? undefined,
      source: url.searchParams.get('source') ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0].message,
        } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const subpage = await prisma.subpage.findUnique({
      where: { id: subpageId },
      select: { id: true },
    });
    if (!subpage) {
      return NextResponse.json(
        {
          success: false,
          error: '서브페이지를 찾을 수 없습니다.',
        } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    const { page, pageSize, authorId, from, to, pinnedOnly, source } =
      parsed.data;

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
          createdBy: {
            select: { id: true, username: true, name: true },
          },
        },
      }),
    ]);

    const data: SubpageVersionListResponse = {
      items: items.map(toListItem),
      total,
      page,
      pageSize,
    };

    return NextResponse.json(
      { success: true, data } satisfies ApiResponse<SubpageVersionListResponse>,
    );
  } catch (err) {
    console.error('[SubpageVersions GET] Unexpected error:', err);
    return NextResponse.json(
      {
        success: false,
        error: '버전 목록 조회에 실패했습니다.',
      } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { user, error } = await requirePermission('subpages', 'update');
  if (error) return error;

  try {
    const { id: subpageId } = await params;
    const subpage = await prisma.subpage.findUnique({
      where: { id: subpageId },
      select: { id: true, title: true },
    });
    if (!subpage) {
      return NextResponse.json(
        {
          success: false,
          error: '서브페이지를 찾을 수 없습니다.',
        } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0].message,
        } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const version = await createSubpageVersionSnapshot({
      subpageId,
      createdById: user!.id,
      label: parsed.data.label ?? null,
      sourceAction: 'MANUAL',
    });

    const auditContext = getAuditContext(request);
    logAuditEvent({
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
      userId: user!.id,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
    });

    return NextResponse.json(
      { success: true, data: { id: version.id } } satisfies ApiResponse<{
        id: string;
      }>,
      { status: 201 },
    );
  } catch (err) {
    console.error('[SubpageVersions POST] Unexpected error:', err);
    return NextResponse.json(
      {
        success: false,
        error: '버전 저장에 실패했습니다.',
      } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
