import { NextResponse } from 'next/server';

import type { Prisma } from '@simple-cms/db';
import { prisma, logAuditEvent } from '@simple-cms/db';
import type { ApiResponse, HomePopupListItem } from '@simple-cms/types';
import { extractTextFromTiptap } from '@simple-cms/editor';

import { requirePermission } from '@/entities/auth/lib/requirePermission';
import { getAuditContext } from '@/shared/lib/auditHelpers';
import { runWithUserDemoSession } from '@/entities/auth/lib/runWithUserDemoSession';
import { createHomePopupSchema } from '@/features/popup-management/model/popupSchemas';

function toListItem(p: {
  id: string;
  popupType: 'CONTENT' | 'IMAGE';
  title: string;
  isVisible: boolean;
  displayOrder: number;
  startDate: Date | null;
  endDate: Date | null;
  imageUrl: string | null;
  imageAlt: string | null;
  linkUrl: string | null;
  buttonLabel: string | null;
  contentJson: unknown;
  createdAt: Date;
  updatedAt: Date;
}): HomePopupListItem {
  return {
    id: p.id,
    popupType: p.popupType,
    title: p.title,
    isVisible: p.isVisible,
    displayOrder: p.displayOrder,
    startDate: p.startDate?.toISOString() ?? null,
    endDate: p.endDate?.toISOString() ?? null,
    imageUrl: p.imageUrl,
    imageAlt: p.imageAlt,
    linkUrl: p.linkUrl,
    buttonLabel: p.buttonLabel,
    hasContent: p.contentJson !== null && p.contentJson !== undefined,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export async function GET(_request: Request): Promise<NextResponse> {
  const { user, error } = await requirePermission('home-popups', 'read');
  if (error) return error;

  return runWithUserDemoSession(user, async () => {
    try {
    const popups = await prisma.homePopup.findMany({
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        popupType: true,
        title: true,
        isVisible: true,
        displayOrder: true,
        startDate: true,
        endDate: true,
        imageUrl: true,
        imageAlt: true,
        linkUrl: true,
        buttonLabel: true,
        contentJson: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const data = popups.map(toListItem);

    return NextResponse.json(
      { success: true, data } satisfies ApiResponse<HomePopupListItem[]>,
    );
    } catch (err) {
    console.error('[HomePopups GET] Unexpected error:', err);
    return NextResponse.json(
      {
        success: false,
        error: '메인 팝업 목록 조회에 실패했습니다.',
      } satisfies ApiResponse<never>,
      { status: 500 },
    );
    }
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  const { user, error } = await requirePermission('home-popups', 'create');
  if (error) return error;

  try {
    const body = await request.json();
    const parsed = createHomePopupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0].message,
        } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const {
      popupType,
      title,
      contentJson,
      imageUrl,
      imageAlt,
      imageMediaId,
      linkUrl,
      buttonLabel,
      isVisible,
      displayOrder,
      startDate,
      endDate,
    } = parsed.data;

    // displayOrder 자동 배정 — 미지정 시 현재 최대 + 1
    let finalOrder = displayOrder;
    if (finalOrder === undefined) {
      const max = await prisma.homePopup.aggregate({
        _max: { displayOrder: true },
      });
      finalOrder = (max._max.displayOrder ?? -1) + 1;
    }

    // imageMediaId 존재 검증 (IMAGE 타입이고 지정된 경우)
    if (imageMediaId) {
      const media = await prisma.media.findUnique({
        where: { id: imageMediaId },
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

    const plainContent =
      popupType === 'CONTENT' && contentJson
        ? extractTextFromTiptap(contentJson as Prisma.JsonObject)
        : null;

    const popup = await prisma.homePopup.create({
      data: {
        popupType,
        title,
        contentJson:
          popupType === 'CONTENT' && contentJson
            ? (contentJson as Prisma.InputJsonValue)
            : undefined,
        content: plainContent,
        imageUrl: popupType === 'IMAGE' ? (imageUrl ?? null) : null,
        imageAlt: popupType === 'IMAGE' ? (imageAlt ?? null) : null,
        imageMediaId: popupType === 'IMAGE' ? (imageMediaId ?? null) : null,
        linkUrl: linkUrl ?? null,
        buttonLabel: buttonLabel ?? null,
        isVisible: isVisible ?? true,
        displayOrder: finalOrder,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
    });

    const auditContext = getAuditContext(request);
    logAuditEvent({
      action: 'CREATE',
      entityType: 'HOME_POPUP',
      entityId: popup.id,
      entityTitle: popup.title,
      changes: {
        after: {
          popupType,
          title,
          isVisible: popup.isVisible,
          displayOrder: popup.displayOrder,
        },
      },
      userId: user!.id,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
    });

    return NextResponse.json(
      { success: true, data: { id: popup.id } } satisfies ApiResponse<{
        id: string;
      }>,
      { status: 201 },
    );
  } catch (err) {
    console.error('[HomePopups POST] Unexpected error:', err);
    return NextResponse.json(
      {
        success: false,
        error: '메인 팝업 생성에 실패했습니다.',
      } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
