import { NextResponse } from 'next/server';

import type { z } from 'zod';

import { prisma, logAuditEvent } from '@simple-cms/db';
import type { Prisma } from '@simple-cms/db';
import { PAGE_BLOCK_MAX_PER_SUBPAGE, type PageBlockListItem } from '@simple-cms/types';

import {
  configSchemaByType,
  createBlockSchema,
} from '@/features/block-management/model/blockSchemas';
import {
  BLOCK_TYPE_LABELS,
  isGoogleMapsEmbedUrl,
  isIframeHostAllowed,
  normalizeIframeEmbedUrl,
} from '@/features/block-management/model/blockLabels';
import { recalculateSubpageContent } from '@/shared/lib/blockContentRecalculation';
import { defineRoute } from '@/entities/auth/lib/defineRoute';

function toListItem(b: {
  id: string;
  subpageId: string;
  blockType: 'RICH_TEXT' | 'HTML' | 'IMAGE' | 'IFRAME' | 'ACCORDION';
  configJson: unknown;
  isVisible: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}): PageBlockListItem {
  return {
    id: b.id,
    subpageId: b.subpageId,
    blockType: b.blockType,
    configJson: b.configJson,
    isVisible: b.isVisible,
    displayOrder: b.displayOrder,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  };
}

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

export const GET = defineRoute<undefined, PageBlockListItem[]>({
  resource: 'subpages',
  action: 'read',
  handler: async ({ params }) => {
    const subpageId = params.id;

    const subpage = await prisma.subpage.findFirst({
      where: { id: subpageId },
      select: { id: true },
    });
    if (!subpage) {
      return NextResponse.json(
        { success: false, error: '서브페이지를 찾을 수 없습니다.' },
        { status: 404 },
      );
    }

    const blocks = await prisma.pageBlock.findMany({
      where: { subpageId },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return blocks.map(toListItem);
  },
});

export const POST = defineRoute<z.infer<typeof createBlockSchema>, null>({
  resource: 'subpages',
  action: 'update',
  schema: createBlockSchema,
  handler: async ({ user, parsed, params, auditCtx }) => {
    const subpageId = params.id;

    const subpage = await prisma.subpage.findFirst({
      where: { id: subpageId },
      select: { id: true, title: true },
    });
    if (!subpage) {
      return NextResponse.json(
        { success: false, error: '서브페이지를 찾을 수 없습니다.' },
        { status: 404 },
      );
    }

    const { blockType, configJson, isVisible } = parsed;

    const configParsed = configSchemaByType[blockType].safeParse(configJson);
    if (!configParsed.success) {
      return NextResponse.json(
        { success: false, error: configParsed.error.issues[0].message },
        { status: 422 },
      );
    }

    if (blockType === 'IFRAME') {
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

    if (blockType === 'IMAGE') {
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

    const currentCount = await prisma.pageBlock.count({ where: { subpageId } });
    if (currentCount >= PAGE_BLOCK_MAX_PER_SUBPAGE) {
      return NextResponse.json(
        {
          success: false,
          error: `서브페이지당 블록은 최대 ${PAGE_BLOCK_MAX_PER_SUBPAGE}개까지 추가할 수 있습니다.`,
        },
        { status: 400 },
      );
    }

    const max = await prisma.pageBlock.aggregate({
      where: { subpageId },
      _max: { displayOrder: true },
    });
    const displayOrder = (max._max.displayOrder ?? -1) + 1;

    const block = await prisma.pageBlock.create({
      data: {
        subpageId,
        blockType,
        configJson: configParsed.data as Prisma.InputJsonValue,
        isVisible: isVisible ?? true,
        displayOrder,
      },
    });

    if (blockType === 'RICH_TEXT' || blockType === 'ACCORDION') {
      await recalculateSubpageContent(subpageId);
    }

    void logAuditEvent({
      action: 'CREATE',
      entityType: 'PAGE_BLOCK',
      entityId: block.id,
      entityTitle: `${subpage.title} — ${BLOCK_TYPE_LABELS[blockType]} 블록`,
      changes: {
        after: {
          blockType,
          isVisible: block.isVisible,
          displayOrder: block.displayOrder,
        },
      },
      userId: user.id,
      ipAddress: auditCtx.ipAddress,
      userAgent: auditCtx.userAgent,
    });

    return NextResponse.json(
      { success: true, data: { id: block.id } },
      { status: 201 },
    );
  },
});
