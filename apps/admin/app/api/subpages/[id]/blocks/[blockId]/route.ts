import { NextResponse } from 'next/server';

import type { z } from 'zod';

import { prisma, logAuditEvent } from '@simple-cms/db';
import type { Prisma } from '@simple-cms/db';
import type { PageBlockDetail } from '@simple-cms/types';

import {
  configSchemaByType,
  updateBlockSchema,
} from '@/features/block-management/model/blockSchemas';
import {
  BLOCK_TYPE_LABELS,
  isGoogleMapsEmbedUrl,
  isIframeHostAllowed,
  normalizeIframeEmbedUrl,
} from '@/features/block-management/model/blockLabels';
import { recalculateSubpageContent } from '@/shared/lib/blockContentRecalculation';
import { renormalizeDisplayOrder } from '@/shared/api/renormalizeDisplayOrder';
import { defineRoute } from '@/shared/api/defineRoute';

type BlockDeleteResult = {
  entityTitle: string;
  blockType: string;
  displayOrder: number;
};

function collectImageMediaIds(config: unknown): string[] {
  const cfg = config as {
    imageMediaId?: unknown;
    items?: Array<{ imageMediaId?: unknown }>;
  } | null;
  const ids: string[] = [];
  if (typeof cfg?.imageMediaId === 'string') ids.push(cfg.imageMediaId);
  if (Array.isArray(cfg?.items)) {
    for (const item of cfg.items) {
      if (typeof item.imageMediaId === 'string') ids.push(item.imageMediaId);
    }
  }
  return Array.from(new Set(ids));
}

export const GET = defineRoute<undefined, PageBlockDetail>({
  resource: 'subpages',
  action: 'read',
  handler: async ({ params }) => {
    const { id: subpageId, blockId } = params;

    const block = await prisma.pageBlock.findFirst({
      where: { id: blockId, subpageId },
    });
    if (!block) {
      return NextResponse.json(
        { success: false, error: '블록을 찾을 수 없습니다.' },
        { status: 404 },
      );
    }

    return {
      id: block.id,
      subpageId: block.subpageId,
      blockType: block.blockType,
      configJson: block.configJson,
      isVisible: block.isVisible,
      displayOrder: block.displayOrder,
      createdAt: block.createdAt.toISOString(),
      updatedAt: block.updatedAt.toISOString(),
    };
  },
});

export const PATCH = defineRoute<z.infer<typeof updateBlockSchema>, null>({
  resource: 'subpages',
  action: 'update',
  schema: updateBlockSchema,
  handler: async ({ user, parsed, params, auditCtx }) => {
    const { id: subpageId, blockId } = params;

    const block = await prisma.pageBlock.findFirst({
      where: { id: blockId, subpageId },
      include: { subpage: { select: { title: true } } },
    });
    if (!block) {
      return NextResponse.json(
        { success: false, error: '블록을 찾을 수 없습니다.' },
        { status: 404 },
      );
    }

    const { configJson, isVisible } = parsed;
    const updateData: Record<string, unknown> = {};

    if (configJson !== undefined) {
      // blockType은 수정 불가 — updateBlockSchema가 blockType을 drop한다. 의도적.
      const configParsed = configSchemaByType[block.blockType].safeParse(configJson);
      if (!configParsed.success) {
        return NextResponse.json(
          { success: false, error: configParsed.error.issues[0].message },
          { status: 422 },
        );
      }

      if (block.blockType === 'IFRAME') {
        const iframeConfig = configParsed.data as { src: string; heightPx?: number | null };
        const normalized = normalizeIframeEmbedUrl(iframeConfig.src);
        if (!normalized || !isIframeHostAllowed(normalized)) {
          return NextResponse.json(
            {
              success: false,
              error: '임베드 가능한 URL이 아닙니다. YouTube/Vimeo 영상 URL 또는 Google Maps embed 코드를 입력해주세요.',
            },
            { status: 422 },
          );
        }
        iframeConfig.src = normalized;
        if (iframeConfig.heightPx == null && isGoogleMapsEmbedUrl(normalized)) {
          iframeConfig.heightPx = 350;
        }
      }

      if (block.blockType === 'IMAGE') {
        const mediaIds = collectImageMediaIds(configParsed.data);
        if (mediaIds.length > 0) {
          const mediaCount = await prisma.media.count({
            where: { id: { in: mediaIds } },
          });
          if (mediaCount !== mediaIds.length) {
            return NextResponse.json(
              { success: false, error: '연결할 미디어를 찾을 수 없습니다.' },
              { status: 400 },
            );
          }
        }
      }

      updateData.configJson = configParsed.data as Prisma.InputJsonValue;
    }

    if (isVisible !== undefined) updateData.isVisible = isVisible;

    if (Object.keys(updateData).length === 0) {
      return null;
    }

    const updated = await prisma.pageBlock.update({
      where: { id: blockId },
      data: updateData,
    });

    if (
      (block.blockType === 'RICH_TEXT' || block.blockType === 'ACCORDION') &&
      configJson !== undefined
    ) {
      await recalculateSubpageContent(subpageId);
    }

    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};
    if (isVisible !== undefined && block.isVisible !== updated.isVisible) {
      before.isVisible = block.isVisible;
      after.isVisible = updated.isVisible;
    }
    if (configJson !== undefined) {
      after.configChanged = true;
    }

    if (Object.keys(after).length > 0) {
      void logAuditEvent({
        action: 'UPDATE',
        entityType: 'PAGE_BLOCK',
        entityId: blockId,
        entityTitle: `${block.subpage.title} — ${BLOCK_TYPE_LABELS[block.blockType]} 블록`,
        changes: { before, after } as Prisma.InputJsonValue,
        userId: user.id,
        ipAddress: auditCtx.ipAddress,
        userAgent: auditCtx.userAgent,
      });
    }

    return null;
  },
});

export const DELETE = defineRoute<undefined, BlockDeleteResult>({
  resource: 'subpages',
  action: 'update',
  responseData: () => null,
  handler: async ({ params }) => {
    const { id: subpageId, blockId } = params;

    const block = await prisma.pageBlock.findFirst({
      where: { id: blockId, subpageId },
      include: { subpage: { select: { title: true } } },
    });
    if (!block) {
      return NextResponse.json(
        { success: false, error: '블록을 찾을 수 없습니다.' },
        { status: 404 },
      );
    }

    await prisma.pageBlock.delete({ where: { id: blockId } });

    if (block.blockType === 'RICH_TEXT' || block.blockType === 'ACCORDION') {
      await recalculateSubpageContent(subpageId);
    }

    await renormalizeDisplayOrder({
      model: 'pageBlock',
      where: { subpageId },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return {
      entityTitle: `${block.subpage.title} — ${BLOCK_TYPE_LABELS[block.blockType]} 블록`,
      blockType: block.blockType,
      displayOrder: block.displayOrder,
    };
  },
  audit: {
    build: (result, ctx) => ({
      action: 'DELETE',
      entityType: 'PAGE_BLOCK',
      entityId: ctx.params.blockId,
      entityTitle: result.entityTitle,
      changes: {
        before: {
          blockType: result.blockType,
          displayOrder: result.displayOrder,
        },
      },
    }),
  },
});
