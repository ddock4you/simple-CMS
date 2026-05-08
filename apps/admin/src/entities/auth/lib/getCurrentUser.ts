import { redirect } from 'next/navigation';

import { getSessionUser, demo } from '@simple-cms/db';

import { getSessionCookie } from '@/shared/lib/cookies';
import type { SessionUser } from '@/entities/auth/model/auth.types';

export async function getCurrentUser(): Promise<SessionUser | null> {
  const sessionToken = await getSessionCookie();
  if (!sessionToken) return null;

  // 시연 모드(DEMO_MODE) 안전망: Session 모델은 extension에서 제외되어 sessionId 격리 외이지만,
  // include 체인의 user/role 동작이 Prisma 7.x에서 100% 검증된 상태가 아니다. runWithBypass로
  // 인증 부트스트랩 전체를 감싸 cross-tenant filter가 인증 흐름을 깨지 않도록 보험 처리한다.
  // 단위 테스트(Phase 6)에서 include 체인 안전 확인되면 후속 PR에서 제거 검토.
  const user = await demo.runWithBypass(() => getSessionUser(sessionToken));
  if (!user) return null;

  const { password: _, ...safeUser } = user;
  return safeUser;
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return user;
}
