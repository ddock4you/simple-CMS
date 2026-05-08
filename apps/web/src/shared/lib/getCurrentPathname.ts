/**
 * Server Component에서 현재 요청 path를 추출하는 헬퍼.
 *
 * Next.js App Router는 Server Component에서 직접 pathname을 노출하지 않음.
 * proxy.ts가 모든 응답에 `x-pathname` 헤더를 주입해 layout이 read.
 *
 * 미설정 시 '/' fallback (개발 환경에서 proxy 미적용 케이스 대비).
 */
import { headers } from 'next/headers';

export async function getCurrentPathname(): Promise<string> {
  const h = await headers();
  return h.get('x-pathname') ?? '/';
}
