import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  prisma,
  logAuditEvent,
  findDanglingMediaIds,
  type SubpageSnapshotPayload,
} from '@simple-cms/db';
import type {
  ApiResponse,
  SubpageVersionDetail,
  SubpageVersionSnapshot,
} from '@simple-cms/types';

import { requirePermission } from '@/entities/auth/lib/requirePermission';
import { getAuditContext } from '@/shared/lib/auditHelpers';

const updateSchema = z.object({
  isPinned: z.boolean(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; versionId: string }> },
): Promise<NextResponse> {
  const { error } = await requirePermission('subpages', 'read');
  if (error) return error;

  try {
    const { id: subpageId, versionId } = await params;

    const version = await prisma.subpageVersion.findFirst({
      where: { id: versionId, subpageId },
      include: {
        createdBy: {
          select: { id: true, username: true, name: true },
        },
      },
    });
    if (!version) {
      return NextResponse.json(
        {
          success: false,
          error: '버전을 찾을 수 없습니다.',
        } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    const snapshot = version.snapshot as unknown as SubpageSnapshotPayload;
    const danglingMediaIds = await findDanglingMediaIds(snapshot);

    const data: SubpageVersionDetail = {
      id: version.id,
      subpageId: version.subpageId,
      createdAt: version.createdAt.toISOString(),
      createdBy: version.createdBy,
      label: version.label,
      sourceAction: version.sourceAction,
      isPinned: version.isPinned,
      snapshot: snapshot as unknown as SubpageVersionSnapshot,
      danglingMediaIds,
    };

    return NextResponse.json(
      { success: true, data } satisfies ApiResponse<SubpageVersionDetail>,
    );
  } catch (err) {
    console.error('[SubpageVersion GET] Unexpected error:', err);
    return NextResponse.json(
      {
        success: false,
        error: '버전 조회에 실패했습니다.',
      } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; versionId: string }> },
): Promise<NextResponse> {
  const { user, error } = await requirePermission('subpages', 'update');
  if (error) return error;

  try {
    const { id: subpageId, versionId } = await params;

    const version = await prisma.subpageVersion.findFirst({
      where: { id: versionId, subpageId },
      include: { subpage: { select: { title: true } } },
    });
    if (!version) {
      return NextResponse.json(
        {
          success: false,
          error: '버전을 찾을 수 없습니다.',
        } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0].message,
        } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const { isPinned } = parsed.data;
    if (isPinned === version.isPinned) {
      return NextResponse.json(
        { success: true, data: null } satisfies ApiResponse<null>,
      );
    }

    await prisma.subpageVersion.update({
      where: { id: versionId },
      data: { isPinned },
    });

    const auditContext = getAuditContext(request);
    logAuditEvent({
      action: 'UPDATE',
      entityType: 'SUBPAGE_VERSION',
      entityId: versionId,
      entityTitle: `${version.subpage.title} — ${
        isPinned ? '버전 고정' : '버전 고정 해제'
      }`,
      changes: {
        before: { isPinned: version.isPinned },
        after: { isPinned },
      },
      userId: user!.id,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
    });

    return NextResponse.json(
      { success: true, data: null } satisfies ApiResponse<null>,
    );
  } catch (err) {
    console.error('[SubpageVersion PATCH] Unexpected error:', err);
    return NextResponse.json(
      {
        success: false,
        error: '버전 수정에 실패했습니다.',
      } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; versionId: string }> },
): Promise<NextResponse> {
  const { user, error } = await requirePermission('subpages', 'update');
  if (error) return error;

  try {
    const { id: subpageId, versionId } = await params;

    const version = await prisma.subpageVersion.findFirst({
      where: { id: versionId, subpageId },
      include: { subpage: { select: { title: true } } },
    });
    if (!version) {
      return NextResponse.json(
        {
          success: false,
          error: '버전을 찾을 수 없습니다.',
        } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    if (version.isPinned) {
      return NextResponse.json(
        {
          success: false,
          error:
            '고정된 버전은 삭제할 수 없습니다. 먼저 고정을 해제해주세요.',
        } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    await prisma.subpageVersion.delete({ where: { id: versionId } });

    const auditContext = getAuditContext(request);
    logAuditEvent({
      action: 'DELETE',
      entityType: 'SUBPAGE_VERSION',
      entityId: versionId,
      entityTitle: `${version.subpage.title} — 버전 삭제`,
      changes: {
        before: {
          versionId,
          sourceAction: version.sourceAction,
          label: version.label,
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
    console.error('[SubpageVersion DELETE] Unexpected error:', err);
    return NextResponse.json(
      {
        success: false,
        error: '버전 삭제에 실패했습니다.',
      } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
