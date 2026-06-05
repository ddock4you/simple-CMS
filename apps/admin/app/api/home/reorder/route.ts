import { NextResponse } from 'next/server';

import { prisma, logAuditEvent } from '@simple-cms/db';
import type { ApiResponse } from '@simple-cms/types';

import { requirePermission } from '@/entities/auth/lib/requirePermission';
import { runWithUserDemoSession } from '@/shared/api/runWithUserDemoSession';
import { getAuditContext } from '@/shared/lib/auditHelpers';
import { reorderHomeSectionsSchema } from '@/features/home-management/model/homeSchemas';

export async function PATCH(request: Request): Promise<NextResponse> {
  const { user, error } = await requirePermission('home', 'update');
  if (error) return error;

  return runWithUserDemoSession(user, async () => {
  try {
    const body = await request.json();
    const parsed = reorderHomeSectionsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0].message,
        } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const { sections } = parsed.data;

    // 중복 id + 중복 displayOrder 검증
    const ids = new Set(sections.map((s) => s.id));
    const orders = new Set(sections.map((s) => s.displayOrder));
    if (ids.size !== sections.length || orders.size !== sections.length) {
      return NextResponse.json(
        {
          success: false,
          error: 'id와 displayOrder는 중복될 수 없습니다.',
        } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    // 모든 id가 실제 HomeSection 레코드인지 확인
    const existing = await prisma.homeSection.findMany({
      where: { id: { in: sections.map((s) => s.id) } },
      select: { id: true },
    });
    if (existing.length !== sections.length) {
      return NextResponse.json(
        {
          success: false,
          error: '존재하지 않는 섹션이 포함되어 있습니다.',
        } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    // Batch update displayOrder
    await prisma.$transaction(
      sections.map((section) =>
        prisma.homeSection.update({
          where: { id: section.id },
          data: { displayOrder: section.displayOrder },
        }),
      ),
    );

    const auditContext = getAuditContext(request);
    logAuditEvent({
      action: 'UPDATE',
      entityType: 'HOME_SECTION',
      entityTitle: '메인 섹션 순서 변경',
      changes: { after: { reorderedSections: sections.length + '건' } },
      userId: user!.id,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
    });

    return NextResponse.json(
      { success: true, data: null } satisfies ApiResponse<null>,
    );
  } catch (err) {
    console.error('[Home Reorder PATCH] Unexpected error:', err);
    return NextResponse.json(
      {
        success: false,
        error: '순서 변경에 실패했습니다.',
      } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
  });
}
