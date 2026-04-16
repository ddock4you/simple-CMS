import { NextResponse } from 'next/server';

import { prisma } from '@simple-cms/db';

import { setPreviewCookie } from '@/shared/lib/previewCookies';

export const runtime = 'nodejs';

/**
 * GET /api/preview?token=...&type=subpage|post&id=...
 *
 * admin에서 발급한 preview 토큰을 교환하여 web 도메인에 preview 쿠키를 세팅한다.
 * 검증 실패 시 홈으로 리다이렉트, 성공 시 대상 콘텐츠 URL로 리다이렉트.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const requestUrl = new URL(request.url);
  const token = requestUrl.searchParams.get('token');
  const type = requestUrl.searchParams.get('type');
  const id = requestUrl.searchParams.get('id');

  const homeUrl = new URL('/', requestUrl);

  if (!token || !type || !id) {
    return NextResponse.redirect(homeUrl);
  }

  const normalizedType = type.toUpperCase();
  if (normalizedType !== 'SUBPAGE' && normalizedType !== 'POST') {
    return NextResponse.redirect(homeUrl);
  }

  try {
    const record = await prisma.previewToken.findUnique({
      where: { token },
      select: { entityType: true, entityId: true, expires: true },
    });

    if (!record) return NextResponse.redirect(homeUrl);
    if (record.expires < new Date()) return NextResponse.redirect(homeUrl);
    if (record.entityType !== normalizedType) {
      return NextResponse.redirect(homeUrl);
    }
    if (record.entityId !== id) return NextResponse.redirect(homeUrl);

    let targetPath: string | null = null;

    if (record.entityType === 'SUBPAGE') {
      const subpage = await prisma.subpage.findUnique({
        where: { id: record.entityId },
        select: { slug: true },
      });
      if (!subpage) return NextResponse.redirect(homeUrl);
      targetPath = `/p/${subpage.slug}`;
    } else {
      const post = await prisma.post.findUnique({
        where: { id: record.entityId },
        select: {
          slug: true,
          board: { select: { slug: true } },
        },
      });
      if (!post) return NextResponse.redirect(homeUrl);
      targetPath = `/board/${post.board.slug}/${post.slug}`;
    }

    const targetUrl = new URL(targetPath, requestUrl);
    targetUrl.searchParams.set('preview', '1');

    const response = NextResponse.redirect(targetUrl);
    setPreviewCookie(response, token);
    return response;
  } catch (err) {
    console.error('[Preview GET] Unexpected error:', err);
    return NextResponse.redirect(homeUrl);
  }
}
