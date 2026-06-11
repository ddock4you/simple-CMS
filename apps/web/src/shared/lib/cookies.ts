/**
 * web 전용 세션 쿠키 read 헬퍼.
 *
 * web은 anonymous 공개라 쿠키 set/clear는 admin Route Handler 책임.
 * web Server Component에서는 read만 필요하므로 getSessionCookie만 노출.
 *
 * 쿠키 이름은 admin과 동기화되어야 함 — basePath /_cms/admin로 인한 cookie path
 * 분리는 setSessionCookie에서 `path: '/'` 명시로 회피되어 단일 origin에서 공유됨.
 */
import { cookies } from 'next/headers';

import { DEMO_SESSION_COOKIE_NAME } from '@simple-cms/types';

export async function getSessionCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(DEMO_SESSION_COOKIE_NAME)?.value;
}
