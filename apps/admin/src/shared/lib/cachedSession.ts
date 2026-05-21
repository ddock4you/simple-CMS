/**
 * 같은 요청(Server Component / API Route) 내 세션 조회를 1회로 dedup하는 React cache 래퍼.
 *
 * - `ensureDemoSession`(시연 layout gate)과 `getCurrentUser`(인증 헬퍼)가 같은 token으로
 *   `prisma.session.findUnique`를 2번 호출하던 문제 해소
 * - `Session` 모델은 DEMO_MODE extension의 EXCLUDED_MODELS이지만 `runWithBypass`로 안전망 한 번 더
 * - 만료된 세션은 `getSessionUser`와 동일하게 즉시 정리 (기존 동작 보존)
 *
 * React `cache()` 는 같은 요청 내 같은 함수 reference의 호출을 메모리에서 dedup. 함수에 인자가
 * 없으므로 모든 호출이 동일 cache key를 공유한다.
 */
import { cache } from 'react';

import { demo, prisma, type Prisma } from '@simple-cms/db';

import { getSessionCookie } from '@/shared/lib/cookies';

export type CachedSession = Prisma.SessionGetPayload<{
  include: { user: { include: { role: true } } };
}>;

export const getCachedSession = cache(
  async (): Promise<CachedSession | null> => {
    const token = await getSessionCookie();
    if (!token) return null;

    return demo.runWithBypass(async () => {
      const session = await prisma.session.findUnique({
        where: { sessionToken: token },
        include: {
          user: { include: { role: true } },
        },
      });
      if (!session) return null;
      if (session.expires < new Date()) {
        await prisma.session
          .delete({ where: { id: session.id } })
          .catch(() => null);
        return null;
      }
      if (session.user.status !== 'ACTIVE') return null;
      return session;
    });
  },
);
