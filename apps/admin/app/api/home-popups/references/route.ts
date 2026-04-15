import { NextResponse } from 'next/server';

import { prisma } from '@simple-cms/db';
import type { ApiResponse, HomePopupReferencesDto } from '@simple-cms/types';

import { requirePermission } from '@/entities/auth/lib/requirePermission';

/**
 * 팝업 LinkTargetInput 탭 드롭다운용 참조 데이터.
 * - subpages: PUBLISHED 서브페이지
 * - boards: isPublic 게시판
 */
export async function GET(_request: Request): Promise<NextResponse> {
  const { error } = await requirePermission('home-popups', 'read');
  if (error) return error;

  try {
    const [subpages, boards] = await Promise.all([
      prisma.subpage.findMany({
        where: { status: 'PUBLISHED' },
        select: { id: true, title: true, slug: true },
        orderBy: { publishedAt: 'desc' },
      }),
      prisma.board.findMany({
        where: { isPublic: true },
        select: { id: true, name: true, slug: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const data: HomePopupReferencesDto = { subpages, boards };

    return NextResponse.json(
      { success: true, data } satisfies ApiResponse<HomePopupReferencesDto>,
    );
  } catch (err) {
    console.error('[HomePopups References GET] Unexpected error:', err);
    return NextResponse.json(
      {
        success: false,
        error: '참조 데이터 조회에 실패했습니다.',
      } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
