import { NextResponse } from 'next/server';

import { prisma } from '@simple-cms/db';
import type { ApiResponse, MediaReferencesResponse } from '@simple-cms/types';

import { defineRoute } from '@/entities/auth/lib/defineRoute';
import { findMediaReferences } from '@/features/media-management/lib/findMediaReferences';

export const GET = defineRoute<undefined, MediaReferencesResponse>({
  resource: 'media',
  action: 'read',
  handler: async ({ params }) => {
    const { id } = params;
    const exists = await prisma.media.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) {
      return NextResponse.json(
        { success: false, error: '미디어를 찾을 수 없습니다.' } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    const references = await findMediaReferences(id);
    return {
      total: references.length,
      references,
    };
  },
});
