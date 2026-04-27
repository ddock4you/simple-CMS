import { NextResponse } from 'next/server';

import { prisma, logAuditEvent } from '@simple-cms/db';
import type { ApiResponse, FeedbackPositiveReason } from '@simple-cms/types';

import { requirePermission } from '@/entities/auth/lib/requirePermission';
import { getAuditContext } from '@/shared/lib/auditHelpers';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  const { user, error } = await requirePermission('subpage-feedback', 'delete');
  if (error) return error;

  try {
    const { id } = await context.params;

    const existing = await prisma.subpageFeedback.findUnique({
      where: { id },
      select: {
        id: true,
        subpageId: true,
        rating: true,
        positiveReasons: true,
        comment: true,
        createdAt: true,
        subpage: { select: { title: true } },
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: '피드백을 찾을 수 없습니다.',
        } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    await prisma.subpageFeedback.delete({ where: { id } });

    const auditContext = getAuditContext(request);
    const commentPreview = existing.comment
      ? existing.comment.slice(0, 200)
      : null;

    logAuditEvent({
      action: 'DELETE',
      entityType: 'SUBPAGE_FEEDBACK',
      entityId: existing.id,
      entityTitle: `${existing.subpage.title} 피드백`,
      changes: {
        before: {
          subpageId: existing.subpageId,
          rating: existing.rating,
          positiveReasons:
            existing.positiveReasons as FeedbackPositiveReason[],
          commentPreview,
          createdAt: existing.createdAt.toISOString(),
        },
      },
      userId: user!.id,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
    });

    return NextResponse.json(
      { success: true, data: { id } } satisfies ApiResponse<{ id: string }>,
    );
  } catch (err) {
    console.error('[SubpageFeedback DELETE] Unexpected error:', err);
    return NextResponse.json(
      {
        success: false,
        error: '피드백 삭제에 실패했습니다.',
      } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
