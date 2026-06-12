import { z } from 'zod';

import { logAuditEvent, prisma } from '@simple-cms/db';
import type { BulkDeleteMediaResponse } from '@simple-cms/types';

import { defineBulkOperation } from '@/entities/auth/lib/defineBulkOperation';
import { findMediaReferences } from '@/features/media-management/lib/findMediaReferences';
import { getStorageAdapter } from '@/shared/lib/storage';

const bulkDeleteSchema = z.object({
  ids: z
    .array(z.string().min(1))
    .min(1, '삭제할 미디어를 선택해주세요.')
    .max(200, '한 번에 최대 200개까지 삭제할 수 있습니다.'),
});

type FailedItem = BulkDeleteMediaResponse['blocked'][number];

export const POST = defineBulkOperation<z.infer<typeof bulkDeleteSchema>, FailedItem>({
  resource: 'media',
  action: 'delete',
  inputSchema: bulkDeleteSchema,
  successKey: 'deleted',
  failKey: 'blocked',
  processItem: async (id, ctx) => {
    const media = await prisma.media.findUnique({
      where: { id },
      select: {
        id: true,
        originalFilename: true,
        filename: true,
        mimeType: true,
        size: true,
        url: true,
      },
    });
    if (!media) return { kind: 'skip' };

    const references = await findMediaReferences(id);
    if (references.length > 0) {
      return {
        kind: 'fail',
        data: {
          id: media.id,
          originalFilename: media.originalFilename,
          references,
        },
      };
    }

    const adapter = getStorageAdapter();
    const storageKey = adapter.urlToStorageKey(media.url);
    if (storageKey) {
      await adapter.delete(storageKey);
    }

    await prisma.media.delete({ where: { id } });

    void logAuditEvent({
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
      userId: ctx.user.id,
      ipAddress: ctx.auditCtx.ipAddress,
      userAgent: ctx.auditCtx.userAgent,
    });

    return { kind: 'success' };
  },
});
