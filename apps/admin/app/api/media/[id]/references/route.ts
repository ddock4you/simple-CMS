import { NextResponse } from 'next/server';

import { prisma } from '@simple-cms/db';
import type { ApiResponse, MediaReferencesResponse } from '@simple-cms/types';

import { requirePermission } from '@/entities/auth/lib/requirePermission';
import { findMediaReferences } from '@/features/media-management/lib/findMediaReferences';

/**
 * GET /api/media/[id]/references
 *
 * 한 미디어의 사용처 목록을 반환한다.
 * 삭제 다이얼로그에서 사전 확인용으로 호출.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { error } = await requirePermission('media', 'read');
  if (error) return error;

  try {
    const { id } = await params;
    const exists = await prisma.media.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) {
      return NextResponse.json(
        {
          success: false,
          error: '미디어를 찾을 수 없습니다.',
        } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    const references = await findMediaReferences(id);
    const data: MediaReferencesResponse = {
      total: references.length,
      references,
    };

    return NextResponse.json(
      { success: true, data } satisfies ApiResponse<MediaReferencesResponse>,
    );
  } catch (err) {
    console.error('[Media references GET] Unexpected error:', err);
    return NextResponse.json(
      {
        success: false,
        error: '사용처 조회에 실패했습니다.',
      } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
