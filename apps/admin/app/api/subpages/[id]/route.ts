import { NextResponse } from 'next/server';

import { prisma, createSubpageVersionSnapshot } from '@simple-cms/db';
import type { ApiResponse } from '@simple-cms/types';
import type { z } from 'zod';

import { updateSubpageSchema } from '@/features/subpage-management/model/subpageSchemas';
import type { SubpageDetail } from '@/features/subpage-management/model/subpageFilters';
import { defineRoute } from '@/shared/api/defineRoute';
import { renormalizeDisplayOrder } from '@/shared/api/renormalizeDisplayOrder';

export const GET = defineRoute<undefined, SubpageDetail>({
  resource: 'subpages',
  action: 'read',
  handler: async ({ params }) => {
    const { id } = params;
    const subpage = await prisma.subpage.findUnique({ where: { id } });
    if (!subpage) {
      return NextResponse.json(
        { success: false, error: '서브 페이지를 찾을 수 없습니다.' } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }
    return {
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
    } satisfies SubpageDetail;
  },
});

type PatchResult = {
  updatedTitle: string;
  before: Record<string, string | boolean | null>;
  after: Record<string, string | boolean | null>;
};

export const PATCH = defineRoute<z.infer<typeof updateSubpageSchema>, PatchResult>({
  resource: 'subpages',
  action: 'update',
  schema: updateSubpageSchema,
  handler: async ({ user, parsed, params }) => {
    const { id } = params;
    const subpage = await prisma.subpage.findUnique({ where: { id } });
    if (!subpage) {
      return NextResponse.json(
        { success: false, error: '서브 페이지를 찾을 수 없습니다.' } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    const { title, seoTitle, seoDescription, status, cclType, cclAi, feedbackEnabled } =
      parsed;

    const willPublish = status === 'PUBLISHED' && subpage.status === 'DRAFT';

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
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

    const updated = await prisma.subpage.update({ where: { id }, data: updateData });

    if (willPublish) {
      try {
        await createSubpageVersionSnapshot({
          subpageId: id,
          createdById: user.id,
          label: null,
          sourceAction: 'AUTO_PUBLISH',
        });
      } catch (snapshotError) {
        console.error('[Subpages PATCH] AUTO_PUBLISH snapshot failed:', snapshotError);
        // 주 액션은 진행 — 감사 로그와 동일한 fire-and-forget 원칙
      }
    }

    const before: Record<string, string | boolean | null> = {};
    const after: Record<string, string | boolean | null> = {};
    if (title !== undefined && title !== subpage.title) {
      before.title = subpage.title;
      after.title = title;
    }
    if (seoTitle !== undefined && (seoTitle ?? null) !== (subpage.seoTitle ?? null)) {
      before.seoTitle = subpage.seoTitle;
      after.seoTitle = seoTitle ?? null;
    }
    if (seoDescription !== undefined && (seoDescription ?? null) !== (subpage.seoDescription ?? null)) {
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

    return { updatedTitle: updated.title, before, after };
  },
  responseData: () => null,
  audit: {
    build: (result, ctx) => {
      if (Object.keys(result.after).length === 0) return null;
      return {
        action: 'UPDATE',
        entityType: 'SUBPAGE',
        entityId: ctx.params.id,
        entityTitle: result.updatedTitle,
        changes: { before: result.before, after: result.after },
      };
    },
  },
});

type DeleteResult = { title: string; slug: string; status: string };

export const DELETE = defineRoute<undefined, DeleteResult>({
  resource: 'subpages',
  action: 'delete',
  handler: async ({ params }) => {
    const { id } = params;
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
    await renormalizeDisplayOrder({ model: 'subpage' });

    return { title: subpage.title, slug: subpage.slug, status: subpage.status };
  },
  responseData: () => null,
  audit: {
    build: (result, ctx) => ({
      action: 'DELETE',
      entityType: 'SUBPAGE',
      entityId: ctx.params.id,
      entityTitle: result.title,
      changes: { before: { title: result.title, slug: result.slug, status: result.status } },
    }),
  },
});
