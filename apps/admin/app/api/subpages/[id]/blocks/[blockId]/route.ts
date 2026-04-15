import { NextResponse } from 'next/server';

import type { Prisma } from '@simple-cms/db';
import { prisma, logAuditEvent } from '@simple-cms/db';
import type { ApiResponse, PageBlockDetail } from '@simple-cms/types';

import { requirePermission } from '@/entities/auth/lib/requirePermission';
import { getAuditContext } from '@/shared/lib/auditHelpers';
import { recalculateSubpageContent } from '@/shared/lib/blockContentRecalculation';
import {
  configSchemaByType,
  updateBlockSchema,
} from '@/features/block-management/model/blockSchemas';
import {
  BLOCK_TYPE_LABELS,
  isIframeHostAllowed,
  normalizeIframeEmbedUrl,
} from '@/features/block-management/model/blockLabels';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; blockId: string }> },
): Promise<NextResponse> {
  const { error } = await requirePermission('subpages', 'read');
  if (error) return error;

  try {
    const { id: subpageId, blockId } = await params;
    const block = await prisma.pageBlock.findFirst({
      where: { id: blockId, subpageId },
    });
    if (!block) {
      return NextResponse.json(
        {
          success: false,
          error: '블록을 찾을 수 없습니다.',
        } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    const data: PageBlockDetail = {
      id: block.id,
      subpageId: block.subpageId,
      blockType: block.blockType,
      configJson: block.configJson,
      isVisible: block.isVisible,
      displayOrder: block.displayOrder,
      createdAt: block.createdAt.toISOString(),
      updatedAt: block.updatedAt.toISOString(),
    };

    return NextResponse.json(
      { success: true, data } satisfies ApiResponse<PageBlockDetail>,
    );
  } catch (err) {
    console.error('[Block GET detail] Unexpected error:', err);
    return NextResponse.json(
      {
        success: false,
        error: '블록 조회에 실패했습니다.',
      } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; blockId: string }> },
): Promise<NextResponse> {
  const { user, error } = await requirePermission('subpages', 'update');
  if (error) return error;

  try {
    const { id: subpageId, blockId } = await params;
    const block = await prisma.pageBlock.findFirst({
      where: { id: blockId, subpageId },
      include: { subpage: { select: { title: true } } },
    });
    if (!block) {
      return NextResponse.json(
        {
          success: false,
          error: '블록을 찾을 수 없습니다.',
        } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    const body = await request.json();
    // blockType은 수정 불가 — safeParse가 extra key(blockType 포함)를 drop한다. 의도적.
    const parsed = updateBlockSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0].message,
        } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const { configJson, isVisible } = parsed.data;

    const updateData: Record<string, unknown> = {};

    if (configJson !== undefined) {
      // 기존 blockType으로 재검증
      const configParsed =
        configSchemaByType[block.blockType].safeParse(configJson);
      if (!configParsed.success) {
        return NextResponse.json(
          {
            success: false,
            error: configParsed.error.issues[0].message,
          } satisfies ApiResponse<never>,
          { status: 422 },
        );
      }

      // IFRAME: src를 embed URL로 정규화 + 호스트 화이트리스트 재검증
      if (block.blockType === 'IFRAME') {
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
        iframeConfig.src = normalized;
      }

      // IMAGE 블록의 imageMediaId 존재 검증
      if (block.blockType === 'IMAGE') {
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

      updateData.configJson = configParsed.data as Prisma.InputJsonValue;
    }

    if (isVisible !== undefined) updateData.isVisible = isVisible;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: true, data: null } satisfies ApiResponse<null>,
      );
    }

    const updated = await prisma.pageBlock.update({
      where: { id: blockId },
      data: updateData,
    });

    // RICH_TEXT configJson 변경 시 검색 인덱스 재집계
    if (block.blockType === 'RICH_TEXT' && configJson !== undefined) {
      await recalculateSubpageContent(subpageId);
    }

    // 감사 로그 — 메타데이터 변경만 추적 (configJson 본문 diff 제외)
    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};
    if (isVisible !== undefined && block.isVisible !== updated.isVisible) {
      before.isVisible = block.isVisible;
      after.isVisible = updated.isVisible;
    }
    if (configJson !== undefined) {
      // configJson 변경 자체는 메타 플래그로만 기록
      after.configChanged = true;
    }

    if (Object.keys(after).length > 0) {
      const auditContext = getAuditContext(request);
      logAuditEvent({
        action: 'UPDATE',
        entityType: 'PAGE_BLOCK',
        entityId: blockId,
        entityTitle: `${block.subpage.title} — ${BLOCK_TYPE_LABELS[block.blockType]} 블록`,
        changes: { before, after } as Prisma.InputJsonValue,
        userId: user!.id,
        ipAddress: auditContext.ipAddress,
        userAgent: auditContext.userAgent,
      });
    }

    return NextResponse.json(
      { success: true, data: null } satisfies ApiResponse<null>,
    );
  } catch (err) {
    console.error('[Block PATCH] Unexpected error:', err);
    return NextResponse.json(
      {
        success: false,
        error: '블록 수정에 실패했습니다.',
      } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; blockId: string }> },
): Promise<NextResponse> {
  const { user, error } = await requirePermission('subpages', 'update');
  if (error) return error;

  try {
    const { id: subpageId, blockId } = await params;
    const block = await prisma.pageBlock.findFirst({
      where: { id: blockId, subpageId },
      include: { subpage: { select: { title: true } } },
    });
    if (!block) {
      return NextResponse.json(
        {
          success: false,
          error: '블록을 찾을 수 없습니다.',
        } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    await prisma.pageBlock.delete({ where: { id: blockId } });

    // RICH_TEXT 블록 삭제 시 검색 인덱스 재집계
    if (block.blockType === 'RICH_TEXT') {
      await recalculateSubpageContent(subpageId);
    }

    // displayOrder 정규화 — 같은 서브페이지의 남은 블록 재배치
    const remaining = await prisma.pageBlock.findMany({
      where: { subpageId },
      select: { id: true },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
    });
    for (let i = 0; i < remaining.length; i++) {
      await prisma.pageBlock.update({
        where: { id: remaining[i].id },
        data: { displayOrder: i },
      });
    }

    const auditContext = getAuditContext(request);
    logAuditEvent({
      action: 'DELETE',
      entityType: 'PAGE_BLOCK',
      entityId: blockId,
      entityTitle: `${block.subpage.title} — ${BLOCK_TYPE_LABELS[block.blockType]} 블록`,
      changes: {
        before: {
          blockType: block.blockType,
          displayOrder: block.displayOrder,
        },
      },
      userId: user!.id,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
    });

    return NextResponse.json(
      { success: true, data: null } satisfies ApiResponse<null>,
    );
  } catch (err) {
    console.error('[Block DELETE] Unexpected error:', err);
    return NextResponse.json(
      {
        success: false,
        error: '블록 삭제에 실패했습니다.',
      } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
