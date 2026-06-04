import { NextResponse } from 'next/server';

import { Prisma, prisma, logAuditEvent } from '@simple-cms/db';
import type { ApiResponse, HomePopupDetail } from '@simple-cms/types';
import { extractTextFromTiptap } from '@simple-cms/editor';

import { requirePermission } from '@/entities/auth/lib/requirePermission';
import { getAuditContext } from '@/shared/lib/auditHelpers';
import { runWithUserDemoSession } from '@/shared/api/runWithUserDemoSession';
import { updateHomePopupSchema } from '@/features/popup-management/model/popupSchemas';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { user, error } = await requirePermission('home-popups', 'read');
  if (error) return error;

  return runWithUserDemoSession(user, async () => {
    try {
    const { id } = await params;
    const popup = await prisma.homePopup.findUnique({ where: { id } });
    if (!popup) {
      return NextResponse.json(
        {
          success: false,
          error: '팝업을 찾을 수 없습니다.',
        } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    const data: HomePopupDetail = {
      id: popup.id,
      popupType: popup.popupType,
      title: popup.title,
      isVisible: popup.isVisible,
      displayOrder: popup.displayOrder,
      startDate: popup.startDate?.toISOString() ?? null,
      endDate: popup.endDate?.toISOString() ?? null,
      imageUrl: popup.imageUrl,
      imageAlt: popup.imageAlt,
      imageMediaId: popup.imageMediaId,
      linkUrl: popup.linkUrl,
      buttonLabel: popup.buttonLabel,
      contentJson: popup.contentJson,
      content: popup.content,
      hasContent: popup.contentJson !== null,
      createdAt: popup.createdAt.toISOString(),
      updatedAt: popup.updatedAt.toISOString(),
    };

    return NextResponse.json(
      { success: true, data } satisfies ApiResponse<HomePopupDetail>,
    );
    } catch (err) {
    console.error('[HomePopup GET detail] Unexpected error:', err);
    return NextResponse.json(
      {
        success: false,
        error: '팝업 조회에 실패했습니다.',
      } satisfies ApiResponse<never>,
      { status: 500 },
    );
    }
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { user, error } = await requirePermission('home-popups', 'update');
  if (error) return error;

  try {
    const { id } = await params;
    const popup = await prisma.homePopup.findUnique({ where: { id } });
    if (!popup) {
      return NextResponse.json(
        {
          success: false,
          error: '팝업을 찾을 수 없습니다.',
        } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    const body = await request.json();
    const parsed = updateHomePopupSchema.safeParse(body);
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

    const finalType = popupType ?? popup.popupType;

    // imageMediaId 존재 검증
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

    const updateData: Record<string, unknown> = {};

    if (popupType !== undefined) updateData.popupType = popupType;
    if (title !== undefined) updateData.title = title;

    if (contentJson !== undefined) {
      if (finalType === 'CONTENT' && contentJson) {
        updateData.contentJson = contentJson as Prisma.InputJsonValue;
        updateData.content = extractTextFromTiptap(
          contentJson as Prisma.JsonObject,
        );
      } else {
        updateData.contentJson = Prisma.DbNull;
        updateData.content = null;
      }
    }

    // 타입이 바뀌면 반대편 필드 초기화
    if (popupType && popupType !== popup.popupType) {
      if (popupType === 'IMAGE') {
        updateData.contentJson = Prisma.DbNull;
        updateData.content = null;
      } else {
        updateData.imageUrl = null;
        updateData.imageAlt = null;
        updateData.imageMediaId = null;
      }
    }

    if (imageUrl !== undefined && finalType === 'IMAGE')
      updateData.imageUrl = imageUrl;
    if (imageAlt !== undefined && finalType === 'IMAGE')
      updateData.imageAlt = imageAlt;
    if (imageMediaId !== undefined && finalType === 'IMAGE')
      updateData.imageMediaId = imageMediaId;

    if (linkUrl !== undefined) updateData.linkUrl = linkUrl;
    if (buttonLabel !== undefined) updateData.buttonLabel = buttonLabel;
    if (isVisible !== undefined) updateData.isVisible = isVisible;
    if (displayOrder !== undefined) updateData.displayOrder = displayOrder;
    if (startDate !== undefined)
      updateData.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined)
      updateData.endDate = endDate ? new Date(endDate) : null;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: true, data: null } satisfies ApiResponse<null>,
      );
    }

    const updated = await prisma.homePopup.update({
      where: { id },
      data: updateData,
    });

    // 감사 로그 — 메타데이터 필드 위주로 diff (contentJson 본문 제외)
    const trackable: Array<keyof typeof updated> = [
      'popupType',
      'title',
      'isVisible',
      'displayOrder',
      'imageUrl',
      'imageAlt',
      'linkUrl',
      'buttonLabel',
      'startDate',
      'endDate',
    ];
    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};
    for (const key of trackable) {
      const prev = popup[key];
      const next = updated[key];
      const normalize = (v: unknown) =>
        v instanceof Date ? v.toISOString() : v;
      if (normalize(prev) !== normalize(next)) {
        before[key] = normalize(prev);
        after[key] = normalize(next);
      }
    }

    if (Object.keys(after).length > 0) {
      const auditContext = getAuditContext(request);
      logAuditEvent({
        action: 'UPDATE',
        entityType: 'HOME_POPUP',
        entityId: id,
        entityTitle: updated.title,
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
    console.error('[HomePopup PATCH] Unexpected error:', err);
    return NextResponse.json(
      {
        success: false,
        error: '팝업 수정에 실패했습니다.',
      } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { user, error } = await requirePermission('home-popups', 'delete');
  if (error) return error;

  try {
    const { id } = await params;
    const popup = await prisma.homePopup.findUnique({ where: { id } });
    if (!popup) {
      return NextResponse.json(
        {
          success: false,
          error: '팝업을 찾을 수 없습니다.',
        } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    await prisma.homePopup.delete({ where: { id } });

    // displayOrder 정규화 — 남은 팝업 순서 재배치
    const remaining = await prisma.homePopup.findMany({
      select: { id: true },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
    });
    for (let i = 0; i < remaining.length; i++) {
      await prisma.homePopup.update({
        where: { id: remaining[i].id },
        data: { displayOrder: i },
      });
    }

    const auditContext = getAuditContext(request);
    logAuditEvent({
      action: 'DELETE',
      entityType: 'HOME_POPUP',
      entityId: id,
      entityTitle: popup.title,
      changes: {
        before: {
          popupType: popup.popupType,
          title: popup.title,
          displayOrder: popup.displayOrder,
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
    console.error('[HomePopup DELETE] Unexpected error:', err);
    return NextResponse.json(
      {
        success: false,
        error: '팝업 삭제에 실패했습니다.',
      } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
