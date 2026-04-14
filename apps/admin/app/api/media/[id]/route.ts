import { NextResponse } from 'next/server';

import { logAuditEvent, prisma } from '@simple-cms/db';
import type {
  ApiResponse,
  MediaDetail,
  MediaReferencesResponse,
} from '@simple-cms/types';

import { requirePermission } from '@/entities/auth/lib/requirePermission';
import { findMediaReferences } from '@/features/media-management/lib/findMediaReferences';
import { updateMediaSchema } from '@/features/media-management/model/mediaSchemas';
import { getAuditContext } from '@/shared/lib/auditHelpers';
import { getStorageAdapter } from '@/shared/lib/storage';

const mediaInclude = {
  uploadedBy: { select: { id: true, name: true, username: true } },
} as const;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { error } = await requirePermission('media', 'read');
  if (error) return error;

  try {
    const { id } = await params;
    const media = await prisma.media.findUnique({
      where: { id },
      include: mediaInclude,
    });
    if (!media) {
      return NextResponse.json(
        {
          success: false,
          error: '미디어를 찾을 수 없습니다.',
        } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    const data: MediaDetail = {
      id: media.id,
      filename: media.filename,
      originalFilename: media.originalFilename,
      mimeType: media.mimeType,
      size: media.size,
      url: media.url,
      alt: media.alt,
      contentHash: media.contentHash,
      uploadedById: media.uploadedById,
      uploadedBy: media.uploadedBy,
      createdAt: media.createdAt.toISOString(),
    };

    return NextResponse.json(
      { success: true, data } satisfies ApiResponse<MediaDetail>,
    );
  } catch (err) {
    console.error('[Media GET detail] Unexpected error:', err);
    return NextResponse.json(
      {
        success: false,
        error: '미디어 조회에 실패했습니다.',
      } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { user, error } = await requirePermission('media', 'update');
  if (error) return error;

  try {
    const { id } = await params;
    const media = await prisma.media.findUnique({ where: { id } });
    if (!media) {
      return NextResponse.json(
        {
          success: false,
          error: '미디어를 찾을 수 없습니다.',
        } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    const body = await request.json();
    const parsed = updateMediaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message ?? '잘못된 요청입니다.',
        } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const { alt } = parsed.data;
    const newAlt = alt === undefined ? media.alt : alt;

    if (newAlt !== media.alt) {
      await prisma.media.update({
        where: { id },
        data: { alt: newAlt },
      });

      const auditContext = getAuditContext(request);
      logAuditEvent({
        action: 'UPDATE',
        entityType: 'MEDIA',
        entityId: id,
        entityTitle: media.originalFilename,
        changes: {
          before: { alt: media.alt ?? '' },
          after: { alt: newAlt ?? '' },
        },
        userId: user!.id,
        ipAddress: auditContext.ipAddress,
        userAgent: auditContext.userAgent,
      });
    }

    return NextResponse.json(
      { success: true, data: null } satisfies ApiResponse<null>,
    );
  } catch (err) {
    console.error('[Media PATCH] Unexpected error:', err);
    const message =
      err instanceof Error ? err.message : '미디어 수정에 실패했습니다.';
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
  const { user, error } = await requirePermission('media', 'delete');
  if (error) return error;

  try {
    const { id } = await params;
    const media = await prisma.media.findUnique({ where: { id } });
    if (!media) {
      return NextResponse.json(
        {
          success: false,
          error: '미디어를 찾을 수 없습니다.',
        } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    // 참조 확인 — 사용 중이면 차단
    const references = await findMediaReferences(id);
    if (references.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            '이 미디어는 다른 콘텐츠에서 사용 중입니다. 먼저 사용처에서 제거해주세요.',
        } satisfies ApiResponse<never>,
        {
          status: 409,
          headers: { 'X-Media-Reference-Count': String(references.length) },
        },
      );
    }

    // 물리 파일 삭제 (실패해도 DB는 진행 — 고아 파일 배치로 정리 가능)
    const adapter = getStorageAdapter();
    const storageKey = adapter.urlToStorageKey(media.url);
    if (storageKey) {
      await adapter.delete(storageKey);
    }

    await prisma.media.delete({ where: { id } });

    const auditContext = getAuditContext(request);
    logAuditEvent({
      action: 'DELETE',
      entityType: 'MEDIA',
      entityId: id,
      entityTitle: media.originalFilename,
      changes: {
        before: {
          filename: media.filename,
          originalFilename: media.originalFilename,
          mimeType: media.mimeType,
          size: media.size,
          url: media.url,
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
    console.error('[Media DELETE] Unexpected error:', err);
    const message =
      err instanceof Error ? err.message : '미디어 삭제에 실패했습니다.';
    return NextResponse.json(
      { success: false, error: message } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}

// Type re-export to avoid unused import warning if MediaReferencesResponse is referenced elsewhere
export type { MediaReferencesResponse };
