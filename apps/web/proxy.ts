import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { logWebError } from '@simple-cms/db';

import { getCachedDomain } from '@/shared/lib/domainCache';

/**
 * 모든 NextResponse.next() 응답에 `x-pathname` 헤더를 주입.
 * RootLayout이 `headers().get('x-pathname')`로 현재 경로를 읽어 DEMO_MODE
 * splash redirect URL의 `next` 파라미터를 정확히 구성할 수 있도록 한다.
 */
function nextWithPathname(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', request.nextUrl.pathname);
  requestHeaders.set('x-search', request.nextUrl.search);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export async function proxy(request: NextRequest) {
  try {
    if (process.env.DEMO_MODE === 'true') {
      return nextWithPathname(request);
    }

    // 개발 모드에서는 localhost 항상 허용
    if (process.env.NODE_ENV === 'development') {
      return nextWithPathname(request);
    }

    const siteDomain = await getCachedDomain();

    // 도메인 미설정 시 리다이렉트 안 함
    if (!siteDomain) {
      return nextWithPathname(request);
    }

    const hostname = request.nextUrl.hostname;

    // 설정 도메인과 일치하면 통과
    if (hostname === siteDomain) {
      return nextWithPathname(request);
    }

    // 불일치 시 301 리다이렉트 (경로 + 쿼리스트링 유지)
    const url = request.nextUrl.clone();
    url.hostname = siteDomain;
    url.protocol = 'https';
    url.port = '';

    return NextResponse.redirect(url, 301);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    // 미들웨어 에러는 로깅하되 사용자 응답을 차단하지 않음 (fail-open)
    logWebError({
      level: 'ERROR',
      source: 'SERVER_MIDDLEWARE',
      message: err.message,
      stack: err.stack,
      url: request.nextUrl.href,
      method: request.method,
      userAgent: request.headers.get('user-agent'),
      ipAddress:
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
      referer: request.headers.get('referer'),
    });
    return nextWithPathname(request);
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
