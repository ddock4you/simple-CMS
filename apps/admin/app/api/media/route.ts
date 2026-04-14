import { NextResponse } from 'next/server';

import { prisma } from '@simple-cms/db';
import type {
  ApiResponse,
  MediaListItem,
  MediaListResponse,
} from '@simple-cms/types';

import { requirePermission } from '@/entities/auth/lib/requirePermission';
import { mediaListQuerySchema } from '@/features/media-management/model/mediaSchemas';

/**
 * GET /api/media
 *
 * 미디어 라이브러리 목록 + 필터 + 페이지네이션.
 * - q: originalFilename / alt 부분 일치 (대소문자 무시)
 * - mimeType: 정확 일치 또는 접두어 (예: "image", "image/png")
 * - 정렬: createdAt DESC
 */
export async function GET(request: Request): Promise<NextResponse> {
  const { error } = await requirePermission('media', 'read');
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const parsed = mediaListQuerySchema.safeParse({
      q: searchParams.get('q') ?? undefined,
      mimeType: searchParams.get('mimeType') ?? undefined,
      page: searchParams.get('page') ?? undefined,
      pageSize: searchParams.get('pageSize') ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message ?? '잘못된 요청입니다.',
        } satisfies ApiResponse<never>,
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
      // 슬래시가 있으면 정확 일치, 없으면 접두어 (image → image/*)
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

    const data: MediaListResponse = {
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

    return NextResponse.json(
      { success: true, data } satisfies ApiResponse<MediaListResponse>,
    );
  } catch (err) {
    console.error('[Media GET] Unexpected error:', err);
    return NextResponse.json(
      {
        success: false,
        error: '미디어 목록 조회에 실패했습니다.',
      } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
