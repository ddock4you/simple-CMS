import { NextResponse } from 'next/server';

import { prisma } from '@simple-cms/db';
import type { ApiResponse, HomeReferencesDto } from '@simple-cms/types';

import { requirePermission } from '@/entities/auth/lib/requirePermission';
import { runWithUserDemoSession } from '@/entities/auth/lib/runWithUserDemoSession';

/**
 * 섹션 편집 Dialog의 드롭다운용 참조 데이터 묶음.
 * - boards: 공개 게시판만
 *
 * NOTICE / GALLERY_COLLECTION 게시판 선택에 사용.
 */
export async function GET(_request: Request): Promise<NextResponse> {
  const { user, error } = await requirePermission('home', 'read');
  if (error) return error;

  return runWithUserDemoSession(user, async () => {
    try {
    const boards = await prisma.board.findMany({
      where: { isPublic: true },
      select: { id: true, name: true },
      orderBy: { createdAt: 'asc' },
    });

    const data: HomeReferencesDto = {
      boards: boards.map((b) => ({ id: b.id, name: b.name })),
    };

    return NextResponse.json(
      { success: true, data } satisfies ApiResponse<HomeReferencesDto>,
    );
    } catch (err) {
    console.error('[Home References GET] Unexpected error:', err);
    return NextResponse.json(
      {
        success: false,
        error: '참조 데이터 조회에 실패했습니다.',
      } satisfies ApiResponse<never>,
      { status: 500 },
    );
    }
  });
}
