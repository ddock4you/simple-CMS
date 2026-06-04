import { NextResponse } from 'next/server';

import { prisma } from '@simple-cms/db';
import type { ApiResponse, HomeReferencesDto } from '@simple-cms/types';

import { requirePermission } from '@/entities/auth/lib/requirePermission';
import { runWithUserDemoSession } from '@/shared/api/runWithUserDemoSession';

/**
 * 섹션 편집 Dialog의 드롭다운용 참조 데이터 묶음.
 * - subpages: published 서브페이지만
 * - boards: 공개 게시판만
 * - posts: published 게시글 (공개 게시판 소속만)
 *
 * 한 번의 요청으로 3개 리소스를 가져와 네트워크 왕복을 줄임.
 */
export async function GET(_request: Request): Promise<NextResponse> {
  const { user, error } = await requirePermission('home', 'read');
  if (error) return error;

  return runWithUserDemoSession(user, async () => {
    try {
    const [subpages, boards, posts] = await Promise.all([
      prisma.subpage.findMany({
        where: { status: 'PUBLISHED' },
        select: { id: true, title: true },
        orderBy: { publishedAt: 'desc' },
      }),
      prisma.board.findMany({
        where: { isPublic: true },
        select: { id: true, name: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.post.findMany({
        where: {
          status: 'PUBLISHED',
          board: { isPublic: true },
        },
        select: {
          id: true,
          title: true,
          board: { select: { name: true } },
        },
        orderBy: { publishedAt: 'desc' },
      }),
    ]);

    const data: HomeReferencesDto = {
      subpages: subpages.map((s) => ({ id: s.id, title: s.title })),
      boards: boards.map((b) => ({ id: b.id, name: b.name })),
      posts: posts.map((p) => ({
        id: p.id,
        title: p.title,
        boardName: p.board.name,
      })),
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
