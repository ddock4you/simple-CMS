/**
 * admin proxy (Next.js 16의 middleware 대체).
 *
 * 단일 책임: 모든 요청에 `x-pathname`/`x-search` 헤더를 주입한다.
 * Server Component layout(`/(authenticated)/layout.tsx`)이 headers로 현재 URL을 읽어,
 * DEMO_MODE에서 `ensureDemoSession`이 splash redirect URL의
 * `next` 파라미터를 정확히 구성할 수 있도록 한다.
 *
 * basePath('/_cms/admin')는 Next.js가 자동 stripping하므로 `request.nextUrl.pathname`은
 * basePath 제외 경로(`/dashboard` 등). 운영(DEMO_MODE 미설정)에서도 헤더만 주입할 뿐
 * 동작 변화 없음 (overhead 무시 가능).
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', request.nextUrl.pathname);
  requestHeaders.set('x-search', request.nextUrl.search);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
