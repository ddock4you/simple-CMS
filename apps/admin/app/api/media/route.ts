import { NextResponse } from 'next/server';

import { prisma } from '@simple-cms/db';
import type { ApiResponse, MediaListItem, MediaListResponse } from '@simple-cms/types';

import { defineRoute } from '@/shared/api/defineRoute';
import { mediaListQuerySchema } from '@/features/media-management/model/mediaSchemas';

export const GET = defineRoute<undefined, MediaListResponse>({
  resource: 'media',
  action: 'read',
  handler: async ({ request }) => {
    const { searchParams } = new URL(request.url);
    const parsed = mediaListQuerySchema.safeParse({
      q: searchParams.get('q') ?? undefined,
      mimeType: searchParams.get('mimeType') ?? undefined,
      page: searchParams.get('page') ?? undefined,
      pageSize: searchParams.get('pageSize') ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: '잘못된 요청입니다.' } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const { q, mimeType, page, pageSize } = parsed.data;

    const where: Record<string, unknown> = {};
    if (q) {
      where.OR = [
        { originalFilename: { contains: q, mode: 'insensitive' } },
        { alt: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (mimeType) {
      where.mimeType = mimeType.includes('/')
        ? mimeType
        : { startsWith: `${mimeType}/` };
    }

    const [items, total] = await Promise.all([
      prisma.media.findMany({
        where,
        include: {
          uploadedBy: { select: { id: true, name: true, username: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.media.count({ where }),
    ]);

    return {
      items: items.map(
        (m): MediaListItem => ({
          id: m.id,
          filename: m.filename,
          originalFilename: m.originalFilename,
          mimeType: m.mimeType,
          size: m.size,
          url: m.url,
          alt: m.alt,
          contentHash: m.contentHash,
          uploadedById: m.uploadedById,
          uploadedBy: m.uploadedBy,
          createdAt: m.createdAt.toISOString(),
        }),
      ),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  },
});
