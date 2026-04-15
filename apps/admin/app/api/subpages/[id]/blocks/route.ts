import { NextResponse } from 'next/server';

import { prisma, logAuditEvent } from '@simple-cms/db';
import type { Prisma } from '@simple-cms/db';
import {
  PAGE_BLOCK_MAX_PER_SUBPAGE,
  type ApiResponse,
  type PageBlockListItem,
} from '@simple-cms/types';

import { requirePermission } from '@/entities/auth/lib/requirePermission';
import { getAuditContext } from '@/shared/lib/auditHelpers';
import { recalculateSubpageContent } from '@/shared/lib/blockContentRecalculation';
import {
  configSchemaByType,
  createBlockSchema,
} from '@/features/block-management/model/blockSchemas';
import {
  BLOCK_TYPE_LABELS,
  isIframeHostAllowed,
  normalizeIframeEmbedUrl,
} from '@/features/block-management/model/blockLabels';

function toListItem(b: {
  id: string;
  subpageId: string;
  blockType: 'RICH_TEXT' | 'HTML' | 'IMAGE' | 'IFRAME';
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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { error } = await requirePermission('subpages', 'read');
  if (error) return error;

  try {
    const { id: subpageId } = await params;

    const subpage = await prisma.subpage.findUnique({
      where: { id: subpageId },
      select: { id: true },
    });
    if (!subpage) {
      return NextResponse.json(
        {
          success: false,
          error: '서브페이지를 찾을 수 없습니다.',
        } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    const blocks = await prisma.pageBlock.findMany({
      where: { subpageId },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return NextResponse.json(
      { success: true, data: blocks.map(toListItem) } satisfies ApiResponse<
        PageBlockListItem[]
      >,
    );
  } catch (err) {
    console.error('[Blocks GET] Unexpected error:', err);
    return NextResponse.json(
      {
        success: false,
        error: '블록 목록 조회에 실패했습니다.',
      } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { user, error } = await requirePermission('subpages', 'update');
  if (error) return error;

  try {
    const { id: subpageId } = await params;

    const subpage = await prisma.subpage.findUnique({
      where: { id: subpageId },
      select: { id: true, title: true },
    });
    if (!subpage) {
      return NextResponse.json(
        {
          success: false,
          error: '서브페이지를 찾을 수 없습니다.',
        } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    const body = await request.json();
    const parsed = createBlockSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0].message,
        } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const { blockType, configJson, isVisible } = parsed.data;

    // blockType별 configJson 재검증 (422)
    const configParsed = configSchemaByType[blockType].safeParse(configJson);
    if (!configParsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: configParsed.error.issues[0].message,
        } satisfies ApiResponse<never>,
        { status: 422 },
      );
    }

    // IFRAME: src를 embed URL로 정규화 + 호스트 화이트리스트 검증
    if (blockType === 'IFRAME') {
      const iframeConfig = configParsed.data as { src: string };
      const normalized = normalizeIframeEmbedUrl(iframeConfig.src);
      if (!normalized || !isIframeHostAllowed(normalized)) {
        return NextResponse.json(
          {
            success: false,
            error:
              '임베드 가능한 URL이 아닙니다. YouTube 또는 Vimeo 영상 URL을 입력해주세요.',
          } satisfies ApiResponse<never>,
          { status: 422 },
        );
      }
      // 정규화된 URL로 저장 (watch?v=... → embed/...)
      iframeConfig.src = normalized;
    }

    // IMAGE 블록의 imageMediaId 존재 검증
    if (blockType === 'IMAGE') {
      const imageConfig = configParsed.data as {
        imageMediaId?: string | null;
      };
      if (imageConfig.imageMediaId) {
        const media = await prisma.media.findUnique({
          where: { id: imageConfig.imageMediaId },
          select: { id: true },
        });
        if (!media) {
          return NextResponse.json(
            {
              success: false,
              error: '연결할 미디어를 찾을 수 없습니다.',
            } satisfies ApiResponse<never>,
            { status: 400 },
          );
        }
      }
    }

    // 블록 개수 상한 검사
    const currentCount = await prisma.pageBlock.count({ where: { subpageId } });
    if (currentCount >= PAGE_BLOCK_MAX_PER_SUBPAGE) {
      return NextResponse.json(
        {
          success: false,
          error: `서브페이지당 블록은 최대 ${PAGE_BLOCK_MAX_PER_SUBPAGE}개까지 추가할 수 있습니다.`,
        } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    // displayOrder 자동 배정
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

    // RICH_TEXT 블록은 검색 인덱스에 영향 → 재집계 (다른 타입은 영향 없지만 단순화 위해 일괄 호출)
    if (blockType === 'RICH_TEXT') {
      await recalculateSubpageContent(subpageId);
    }

    const auditContext = getAuditContext(request);
    logAuditEvent({
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
      userId: user!.id,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
    });

    return NextResponse.json(
      { success: true, data: { id: block.id } } satisfies ApiResponse<{
        id: string;
      }>,
      { status: 201 },
    );
  } catch (err) {
    console.error('[Blocks POST] Unexpected error:', err);
    return NextResponse.json(
      {
        success: false,
        error: '블록 생성에 실패했습니다.',
      } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
