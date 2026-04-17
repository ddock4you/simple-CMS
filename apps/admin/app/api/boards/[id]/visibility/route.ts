import { NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma, logAuditEvent } from '@simple-cms/db';
import type { ApiResponse } from '@simple-cms/types';

import { requirePermission } from '@/entities/auth/lib/requirePermission';
import { getAuditContext } from '@/shared/lib/auditHelpers';

const visibilitySchema = z.object({
  isPublic: z.boolean(),
});

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
    const parsed = visibilitySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const { isPublic } = parsed.data;
    if (isPublic === board.isPublic) {
      return NextResponse.json(
        { success: true, data: null } satisfies ApiResponse<null>,
      );
    }

    const updated = await prisma.board.update({
      where: { id },
      data: { isPublic },
    });

    const auditContext = getAuditContext(request);
    logAuditEvent({
      action: 'UPDATE',
      entityType: 'BOARD',
      entityId: id,
      entityTitle: `${updated.name} (공개 변경)`,
      changes: {
        before: { isPublic: String(board.isPublic) },
        after: { isPublic: String(isPublic) },
      },
      userId: user!.id,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
    });

    return NextResponse.json(
      { success: true, data: null } satisfies ApiResponse<null>,
    );
  } catch (err) {
    console.error('[Boards PATCH visibility] Unexpected error:', err);
    const message =
      err instanceof Error ? err.message : '공개 상태 변경에 실패했습니다.';
    return NextResponse.json(
      { success: false, error: message } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
