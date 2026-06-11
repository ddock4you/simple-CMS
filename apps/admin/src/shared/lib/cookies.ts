import { cookies } from 'next/headers';

import { DEMO_SESSION_COOKIE_NAME } from '@simple-cms/types';

// 시연 모드: 1시간 TTL — visitor 만료 시 layout gate가 splash로 보내 새 세션 발급.
// 운영: 30일.
// sessionHelper.ts의 SESSION_MAX_AGE_MS와 동일 분기 — 한쪽만 바꾸면 cookie ↔ DB 만료 불일치.
const SESSION_MAX_AGE =
  process.env.DEMO_MODE === 'true' ? 60 * 60 : 30 * 24 * 60 * 60;

export async function setSessionCookie(sessionToken: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(DEMO_SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(DEMO_SESSION_COOKIE_NAME);
}

export async function getSessionCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(DEMO_SESSION_COOKIE_NAME)?.value;
}
