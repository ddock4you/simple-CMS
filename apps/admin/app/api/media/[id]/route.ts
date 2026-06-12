import { NextResponse } from 'next/server';
import type { z } from 'zod';

import { prisma } from '@simple-cms/db';
import type { ApiResponse, MediaDetail } from '@simple-cms/types';

import { defineRoute } from '@/entities/auth/lib/defineRoute';
import { findMediaReferences } from '@/features/media-management/lib/findMediaReferences';
import { updateMediaSchema } from '@/features/media-management/model/mediaSchemas';
import { getStorageAdapter } from '@/shared/lib/storage';

const mediaInclude = {
  uploadedBy: { select: { id: true, name: true, username: true } },
} as const;

export const GET = defineRoute<undefined, MediaDetail>({
  resource: 'media',
  action: 'read',
  handler: async ({ params }) => {
    const { id } = params;
    const media = await prisma.media.findUnique({ where: { id }, include: mediaInclude });
    if (!media) {
      return NextResponse.json(
        { success: false, error: '미디어를 찾을 수 없습니다.' } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    return {
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
    } satisfies MediaDetail;
  },
});

type PatchResult = {
  originalFilename: string;
  before: string | null;
  after: string | null;
};

export const PATCH = defineRoute<z.infer<typeof updateMediaSchema>, PatchResult>({
  resource: 'media',
  action: 'update',
  schema: updateMediaSchema,
  handler: async ({ parsed, params }) => {
    const { id } = params;
    const media = await prisma.media.findUnique({ where: { id } });
    if (!media) {
      return NextResponse.json(
        { success: false, error: '미디어를 찾을 수 없습니다.' } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    const { alt } = parsed;
    const newAlt = alt === undefined ? media.alt : alt;

    if (newAlt === media.alt) {
      return NextResponse.json(
        { success: true, data: null } satisfies ApiResponse<null>,
      );
    }

    await prisma.media.update({ where: { id }, data: { alt: newAlt } });

    return { originalFilename: media.originalFilename, before: media.alt, after: newAlt };
  },
  responseData: () => null,
  audit: {
    build: (result, ctx) => ({
      action: 'UPDATE',
      entityType: 'MEDIA',
      entityId: ctx.params.id,
      entityTitle: result.originalFilename,
      changes: {
        before: { alt: result.before ?? '' },
        after: { alt: result.after ?? '' },
      },
    }),
  },
});

type DeleteResult = {
  originalFilename: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
};

export const DELETE = defineRoute<undefined, DeleteResult>({
  resource: 'media',
  action: 'delete',
  handler: async ({ params }) => {
    const { id } = params;
    const media = await prisma.media.findUnique({ where: { id } });
    if (!media) {
      return NextResponse.json(
        { success: false, error: '미디어를 찾을 수 없습니다.' } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    const references = await findMediaReferences(id);
    if (references.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: '이 미디어는 다른 콘텐츠에서 사용 중입니다. 먼저 사용처에서 제거해주세요.',
        } satisfies ApiResponse<never>,
        {
          status: 409,
          headers: { 'X-Media-Reference-Count': String(references.length) },
        },
      );
    }

    const adapter = getStorageAdapter();
    const storageKey = adapter.urlToStorageKey(media.url);
    if (storageKey) {
      await adapter.delete(storageKey);
    }

    await prisma.media.delete({ where: { id } });

    return {
      originalFilename: media.originalFilename,
      filename: media.filename,
      mimeType: media.mimeType,
      size: media.size,
      url: media.url,
    };
  },
  responseData: () => null,
  audit: {
    build: (result, ctx) => ({
      action: 'DELETE',
      entityType: 'MEDIA',
      entityId: ctx.params.id,
      entityTitle: result.originalFilename,
      changes: {
        before: {
          filename: result.filename,
          originalFilename: result.originalFilename,
          mimeType: result.mimeType,
          size: result.size,
          url: result.url,
        },
      },
    }),
  },
});
