import { redirect } from 'next/navigation';

import { demo } from '@simple-cms/db';

import { getCachedSession } from '@/shared/lib/cachedSession';
import type { SessionUser } from '@/entities/auth/model/auth.types';

export async function getCurrentUser(): Promise<SessionUser | null> {
  // `getCachedSession`이 React `cache()`로 같은 요청 내 호출을 dedup.
  // `ensureDemoSession`도 같은 헬퍼를 사용하므로 admin layout의 2-쿼리가 1-쿼리로 통합된다.
  // Session 모델은 DEMO extension의 EXCLUDED_MODELS + `runWithBypass` 이중 안전망 그대로 유지.
  const session = await getCachedSession();
  if (!session) return null;

  if (process.env.DEMO_MODE === 'true') {
    demo.enterWith({ sessionId: session.user.sessionId });
  }

  const { password: _, ...safeUser } = session.user;
  return safeUser;
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return user;
}
