import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { getCachedDomain } from '@/shared/lib/domainCache';

export async function proxy(request: NextRequest) {
  // 개발 모드에서는 localhost 항상 허용
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.next();
  }

  const siteDomain = await getCachedDomain();

  // 도메인 미설정 시 리다이렉트 안 함
  if (!siteDomain) {
    return NextResponse.next();
  }

  const hostname = request.nextUrl.hostname;

  // 설정 도메인과 일치하면 통과
  if (hostname === siteDomain) {
    return NextResponse.next();
  }

  // 불일치 시 301 리다이렉트 (경로 + 쿼리스트링 유지)
  const url = request.nextUrl.clone();
  url.hostname = siteDomain;
  url.protocol = 'https';
  url.port = '';

  return NextResponse.redirect(url, 301);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
