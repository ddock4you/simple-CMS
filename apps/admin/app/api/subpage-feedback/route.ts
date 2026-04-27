import { NextResponse } from 'next/server';

import { prisma } from '@simple-cms/db';
import type {
  ApiResponse,
  FeedbackListItem,
  FeedbackListResponse,
  FeedbackPositiveReason,
} from '@simple-cms/types';

import { requirePermission } from '@/entities/auth/lib/requirePermission';
import { feedbackListQuerySchema } from '@/features/subpage-feedback/model/feedbackFilters';

export async function GET(request: Request): Promise<NextResponse> {
  const { error } = await requirePermission('subpage-feedback', 'read');
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const parsed = feedbackListQuerySchema.safeParse({
      subpageId: searchParams.get('subpageId') ?? undefined,
      rating: searchParams.get('rating') ?? undefined,
      from: searchParams.get('from') ?? undefined,
      to: searchParams.get('to') ?? undefined,
      q: searchParams.get('q') ?? undefined,
      page: searchParams.get('page') ?? undefined,
      pageSize: searchParams.get('pageSize') ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: '잘못된 요청입니다.',
        } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const { subpageId, rating, from, to, q, page, pageSize } = parsed.data;

    const where: Record<string, unknown> = {};
    if (subpageId) where.subpageId = subpageId;
    if (rating !== 'ALL') where.rating = rating;
    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
      };
    }
    if (q) where.comment = { contains: q, mode: 'insensitive' };

    const [items, total] = await Promise.all([
      prisma.subpageFeedback.findMany({
        where,
        select: {
          id: true,
          subpageId: true,
          rating: true,
          positiveReasons: true,
          comment: true,
          createdAt: true,
          subpage: { select: { title: true, slug: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.subpageFeedback.count({ where }),
    ]);

    const data: FeedbackListResponse = {
      items: items.map<FeedbackListItem>((item) => ({
        id: item.id,
        subpageId: item.subpageId,
        subpageTitle: item.subpage.title,
        subpageSlug: item.subpage.slug,
        rating: item.rating,
        positiveReasons: item.positiveReasons as FeedbackPositiveReason[],
        comment: item.comment,
        createdAt: item.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };

    return NextResponse.json(
      { success: true, data } satisfies ApiResponse<FeedbackListResponse>,
    );
  } catch (err) {
    console.error('[SubpageFeedback GET] Unexpected error:', err);
    return NextResponse.json(
      {
        success: false,
        error: '피드백 목록 조회에 실패했습니다.',
      } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
