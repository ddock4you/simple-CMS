import { NextResponse } from 'next/server';

import { logAuditEvent, prisma } from '@simple-cms/db';
import type {
  ApiResponse,
  BulkDeleteMediaResponse,
} from '@simple-cms/types';
import { z } from 'zod';

import { requirePermission } from '@/entities/auth/lib/requirePermission';
import { findMediaReferences } from '@/features/media-management/lib/findMediaReferences';
import { getAuditContext } from '@/shared/lib/auditHelpers';
import { getStorageAdapter } from '@/shared/lib/storage';

/**
 * POST /api/media/bulk-delete
 *
 * 미디어 일괄 삭제.
 * - 각 id마다 `findMediaReferences()`로 참조 확인
 * - 참조 있음 → `blocked`에 포함 (삭제 안 함)
 * - 참조 없음 → StorageAdapter.delete + prisma.media.delete + 감사 로그 DELETE
 * - 트랜잭션 아님 (각 삭제 독립적, 부분 실패 허용)
 * - 존재하지 않는 id는 조용히 skip
 *
 * 권한: `media:delete`
 */

const bulkDeleteSchema = z.object({
  ids: z
    .array(z.string().min(1))
    .min(1, '삭제할 미디어를 선택해주세요.')
    .max(200, '한 번에 최대 200개까지 삭제할 수 있습니다.'),
});

export async function POST(request: Request): Promise<NextResponse> {
  const { user, error } = await requirePermission('media', 'delete');
  if (error) return error;

  try {
    const body = await request.json();
    const parsed = bulkDeleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message ?? '잘못된 요청입니다.',
        } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    // 중복 제거
    const ids = Array.from(new Set(parsed.data.ids));

    const medias = await prisma.media.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        originalFilename: true,
        filename: true,
        mimeType: true,
        size: true,
        url: true,
      },
    });

    const adapter = getStorageAdapter();
    const auditContext = getAuditContext(request);

    const deleted: string[] = [];
    const blocked: BulkDeleteMediaResponse['blocked'] = [];

    // 의도적 per-item 루프: 참조 확인 후 개별 삭제/차단 분리 → partial success 행동.
    // zod max(200) 상한으로 최대 쿼리 수 통제.
    for (const media of medias) {
      const references = await findMediaReferences(media.id);
      if (references.length > 0) {
        blocked.push({
          id: media.id,
          originalFilename: media.originalFilename,
          references,
        });
        continue;
      }

      const storageKey = adapter.urlToStorageKey(media.url);
      if (storageKey) {
        await adapter.delete(storageKey);
      }

      await prisma.media.delete({ where: { id: media.id } });

      logAuditEvent({
        action: 'DELETE',
        entityType: 'MEDIA',
        entityId: media.id,
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

      deleted.push(media.id);
    }

    const data: BulkDeleteMediaResponse = { deleted, blocked };
    return NextResponse.json(
      { success: true, data } satisfies ApiResponse<BulkDeleteMediaResponse>,
    );
  } catch (err) {
    console.error('[Media bulk-delete] Unexpected error:', err);
    const message =
      err instanceof Error ? err.message : '일괄 삭제에 실패했습니다.';
    return NextResponse.json(
      { success: false, error: message } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
