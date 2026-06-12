import { NextResponse } from 'next/server';

import { z } from 'zod';

import {
  prisma,
  logAuditEvent,
  findDanglingMediaIds,
  type SubpageSnapshotPayload,
} from '@simple-cms/db';
import type { SubpageVersionDetail, SubpageVersionSnapshot } from '@simple-cms/types';

import { defineRoute } from '@/entities/auth/lib/defineRoute';

const updateSchema = z.object({
  isPinned: z.boolean(),
});

export const GET = defineRoute<undefined, SubpageVersionDetail>({
  resource: 'subpages',
  action: 'read',
  handler: async ({ params }) => {
    const { id: subpageId, versionId } = params;

    const version = await prisma.subpageVersion.findFirst({
      where: { id: versionId, subpageId },
      include: {
        createdBy: { select: { id: true, username: true, name: true } },
      },
    });
    if (!version) {
      return NextResponse.json(
        { success: false, error: '버전을 찾을 수 없습니다.' },
        { status: 404 },
      );
    }

    const snapshot = version.snapshot as unknown as SubpageSnapshotPayload;
    const danglingMediaIds = await findDanglingMediaIds(snapshot);

    return {
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
  },
});

export const PATCH = defineRoute<z.infer<typeof updateSchema>, null>({
  resource: 'subpages',
  action: 'update',
  schema: updateSchema,
  handler: async ({ user, parsed, params, auditCtx }) => {
    const { id: subpageId, versionId } = params;

    const version = await prisma.subpageVersion.findFirst({
      where: { id: versionId, subpageId },
      include: { subpage: { select: { title: true } } },
    });
    if (!version) {
      return NextResponse.json(
        { success: false, error: '버전을 찾을 수 없습니다.' },
        { status: 404 },
      );
    }

    const { isPinned } = parsed;
    if (isPinned === version.isPinned) {
      return null;
    }

    await prisma.subpageVersion.update({
      where: { id: versionId },
      data: { isPinned },
    });

    void logAuditEvent({
      action: 'UPDATE',
      entityType: 'SUBPAGE_VERSION',
      entityId: versionId,
      entityTitle: `${version.subpage.title} — ${isPinned ? '버전 고정' : '버전 고정 해제'}`,
      changes: {
        before: { isPinned: version.isPinned },
        after: { isPinned },
      },
      userId: user.id,
      ipAddress: auditCtx.ipAddress,
      userAgent: auditCtx.userAgent,
    });

    return null;
  },
});

export const DELETE = defineRoute<undefined, null>({
  resource: 'subpages',
  action: 'update',
  handler: async ({ user, params, auditCtx }) => {
    const { id: subpageId, versionId } = params;

    const version = await prisma.subpageVersion.findFirst({
      where: { id: versionId, subpageId },
      include: { subpage: { select: { title: true } } },
    });
    if (!version) {
      return NextResponse.json(
        { success: false, error: '버전을 찾을 수 없습니다.' },
        { status: 404 },
      );
    }

    if (version.isPinned) {
      return NextResponse.json(
        {
          success: false,
          error: '고정된 버전은 삭제할 수 없습니다. 먼저 고정을 해제해주세요.',
        },
        { status: 400 },
      );
    }

    await prisma.subpageVersion.delete({ where: { id: versionId } });

    void logAuditEvent({
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
      userId: user.id,
      ipAddress: auditCtx.ipAddress,
      userAgent: auditCtx.userAgent,
    });

    return null;
  },
});
