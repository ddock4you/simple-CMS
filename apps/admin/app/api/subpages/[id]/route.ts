import { NextResponse } from 'next/server';

import { prisma, logAuditEvent, createSubpageVersionSnapshot } from '@simple-cms/db';
import type { ApiResponse } from '@simple-cms/types';

import { requirePermission } from '@/entities/auth/lib/requirePermission';
import { getAuditContext } from '@/shared/lib/auditHelpers';
import { updateSubpageSchema } from '@/features/subpage-management/model/subpageSchemas';
import type { SubpageDetail } from '@/features/subpage-management/model/subpageFilters';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { error } = await requirePermission('subpages', 'read');
  if (error) return error;

  try {
    const { id } = await params;
    const subpage = await prisma.subpage.findUnique({ where: { id } });

    if (!subpage) {
      return NextResponse.json(
        { success: false, error: '서브 페이지를 찾을 수 없습니다.' } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    const data: SubpageDetail = {
      id: subpage.id,
      title: subpage.title,
      slug: subpage.slug,
      seoTitle: subpage.seoTitle,
      seoDescription: subpage.seoDescription,
      status: subpage.status,
      publishedAt: subpage.publishedAt?.toISOString() ?? null,
      cclType: subpage.cclType,
      cclAi: subpage.cclAi,
      feedbackEnabled: subpage.feedbackEnabled,
      displayOrder: subpage.displayOrder,
      revision: subpage.revision,
      createdAt: subpage.createdAt.toISOString(),
      updatedAt: subpage.updatedAt.toISOString(),
    };

    return NextResponse.json(
      { success: true, data } satisfies ApiResponse<SubpageDetail>,
    );
  } catch (err) {
    console.error('[Subpages GET detail] Unexpected error:', err);
    const message =
      err instanceof Error ? err.message : '서브 페이지 조회에 실패했습니다.';
    return NextResponse.json(
      { success: false, error: message } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { user, error } = await requirePermission('subpages', 'update');
  if (error) return error;

  try {
    const { id } = await params;
    const subpage = await prisma.subpage.findUnique({ where: { id } });
    if (!subpage) {
      return NextResponse.json(
        { success: false, error: '서브 페이지를 찾을 수 없습니다.' } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    const body = await request.json();
    const parsed = updateSubpageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const {
      title,
      slug,
      seoTitle,
      seoDescription,
      status,
      cclType,
      cclAi,
      feedbackEnabled,
    } = parsed.data;

    if (slug && slug !== subpage.slug) {
      const existing = await prisma.subpage.findFirst({ where: { slug } });
      if (existing) {
        return NextResponse.json(
          { success: false, error: '이미 사용 중인 slug입니다.' } satisfies ApiResponse<never>,
          { status: 409 },
        );
      }
    }

    const willPublish =
      status === 'PUBLISHED' && subpage.status === 'DRAFT';

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (slug !== undefined) updateData.slug = slug;
    if (seoTitle !== undefined) updateData.seoTitle = seoTitle;
    if (seoDescription !== undefined) updateData.seoDescription = seoDescription;
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'PUBLISHED' && subpage.status === 'DRAFT') {
        updateData.publishedAt = new Date();
      }
    }
    if (cclType !== undefined) {
      updateData.cclType = cclType;
      if (cclType === null) updateData.cclAi = false;
    }
    if (cclAi !== undefined) {
      const nextType = cclType !== undefined ? cclType : subpage.cclType;
      updateData.cclAi = nextType ? cclAi : false;
    }
    if (feedbackEnabled !== undefined) updateData.feedbackEnabled = feedbackEnabled;

    const updated = await prisma.subpage.update({
      where: { id },
      data: updateData,
    });

    if (willPublish) {
      try {
        await createSubpageVersionSnapshot({
          subpageId: id,
          createdById: user!.id,
          label: null,
          sourceAction: 'AUTO_PUBLISH',
        });
      } catch (snapshotError) {
        console.error(
          '[Subpages PATCH] AUTO_PUBLISH snapshot failed:',
          snapshotError,
        );
        // 주 액션은 진행 — 감사 로그와 동일한 fire-and-forget 원칙
      }
    }

    const before: Record<string, string | boolean | null> = {};
    const after: Record<string, string | boolean | null> = {};
    if (title !== undefined && title !== subpage.title) {
      before.title = subpage.title;
      after.title = title;
    }
    if (slug !== undefined && slug !== subpage.slug) {
      before.slug = subpage.slug;
      after.slug = slug;
    }
    if (
      seoTitle !== undefined &&
      (seoTitle ?? null) !== (subpage.seoTitle ?? null)
    ) {
      before.seoTitle = subpage.seoTitle;
      after.seoTitle = seoTitle ?? null;
    }
    if (
      seoDescription !== undefined &&
      (seoDescription ?? null) !== (subpage.seoDescription ?? null)
    ) {
      before.seoDescription = subpage.seoDescription;
      after.seoDescription = seoDescription ?? null;
    }
    if (status !== undefined && status !== subpage.status) {
      before.status = subpage.status;
      after.status = status;
    }
    if (updated.cclType !== subpage.cclType) {
      before.cclType = subpage.cclType;
      after.cclType = updated.cclType;
    }
    if (updated.cclAi !== subpage.cclAi) {
      before.cclAi = subpage.cclAi;
      after.cclAi = updated.cclAi;
    }
    if (updated.feedbackEnabled !== subpage.feedbackEnabled) {
      before.feedbackEnabled = subpage.feedbackEnabled;
      after.feedbackEnabled = updated.feedbackEnabled;
    }

    if (Object.keys(after).length > 0) {
      const auditContext = getAuditContext(request);
      logAuditEvent({
        action: 'UPDATE',
        entityType: 'SUBPAGE',
        entityId: id,
        entityTitle: updated.title,
        changes: { before, after },
        userId: user!.id,
        ipAddress: auditContext.ipAddress,
        userAgent: auditContext.userAgent,
      });
    }

    return NextResponse.json(
      { success: true, data: null } satisfies ApiResponse<null>,
    );
  } catch (err) {
    console.error('[Subpages PATCH] Unexpected error:', err);
    const message =
      err instanceof Error ? err.message : '서브 페이지 수정에 실패했습니다.';
    return NextResponse.json(
      { success: false, error: message } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { user, error } = await requirePermission('subpages', 'delete');
  if (error) return error;

  try {
    const { id } = await params;
    const subpage = await prisma.subpage.findUnique({
      where: { id },
      include: { _count: { select: { navigationMenuItems: true } } },
    });

    if (!subpage) {
      return NextResponse.json(
        { success: false, error: '서브 페이지를 찾을 수 없습니다.' } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    if (subpage._count.navigationMenuItems > 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            '이 서브 페이지를 참조하는 메뉴 항목이 있습니다. 먼저 메뉴 연결을 해제해주세요.',
        } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    await prisma.subpage.delete({ where: { id } });

    // Renormalize displayOrder
    const remaining = await prisma.subpage.findMany({
      select: { id: true },
      orderBy: [{ displayOrder: 'asc' }, { updatedAt: 'desc' }],
    });
    for (let i = 0; i < remaining.length; i++) {
      await prisma.subpage.update({
        where: { id: remaining[i].id },
        data: { displayOrder: i },
      });
    }

    const auditContext = getAuditContext(request);
    logAuditEvent({
      action: 'DELETE',
      entityType: 'SUBPAGE',
      entityId: id,
      entityTitle: subpage.title,
      changes: { before: { title: subpage.title, slug: subpage.slug, status: subpage.status } },
      userId: user!.id,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
    });

    return NextResponse.json(
      { success: true, data: null } satisfies ApiResponse<null>,
    );
  } catch (err) {
    console.error('[Subpages DELETE] Unexpected error:', err);
    const message =
      err instanceof Error ? err.message : '서브 페이지 삭제에 실패했습니다.';
    return NextResponse.json(
      { success: false, error: message } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
