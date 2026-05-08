/**
 * admin Server Component에서 현재 요청 path 추출.
 *
 * proxy.ts가 모든 응답에 `x-pathname` 헤더를 주입한다.
 * Next.js basePath가 자동 stripping되므로 admin 컨텍스트에서 받는 값은 basePath 제외 path
 * (예: '/dashboard'). DEMO_MODE splash로 redirect할 때 next 파라미터에 이 값이 들어가고,
 * 다시 admin으로 돌아올 때 router.replace가 basePath를 prepend한다.
 */
import { headers } from 'next/headers';

export async function getCurrentPathname(): Promise<string> {
  const h = await headers();
  return h.get('x-pathname') ?? '/';
}
