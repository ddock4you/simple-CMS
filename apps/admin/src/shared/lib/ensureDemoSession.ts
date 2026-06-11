/**
 * 시연 모드(DEMO_MODE) admin layout gate.
 *
 * 진입 흐름:
 *   - DEMO_MODE !== 'true' → no-op (운영 환경 영향 0)
 *   - currentPath가 splash 자체(/demo-bootstrap*) → no-op (self-loop 회피)
 *   - cookie 'session-token' 있음 + 유효 + ACTIVE → demo.enterWith({sessionId}) 부착 + 5% 확률 lazy cleanup
 *   - 그 외 → `/demo-bootstrap?next={path}` redirect
 *
 * `enterWith`로 부착한 sessionId는 같은 async tree의 모든 후속 await에 적용되어
 * Prisma extension이 자동 격리한다.
 *
 * 반환값: 성공 시 `{ sessionId, expiresAt }`, 그 외(no-op/redirect)는 null.
 * DemoBanner의 카운트다운은 expiresAt prop을 사용한다.
 *
 * Lazy cleanup: 5% 확률로 만료 정리를 `after()` 후크로 비동기 실행 — 응답 latency 0.
 *   Storage 정리는 cron(/api/demo/cleanup)에서 처리하고 lazy는 DB만.
 */
import { redirect } from 'next/navigation';
import { after } from 'next/server';

import { demo, cleanupExpiredSessions } from '@simple-cms/db';
import { DEMO_BOOTSTRAP_PATH, demoBootstrapPath } from '@simple-cms/types';

import { getCachedSession } from '@/shared/lib/cachedSession';

const LAZY_CLEANUP_PROBABILITY = 0.05;

export interface DemoSessionInfo {
  /** 격리 sessionId (User.sessionId, AsyncLocalStorage에 부착된 값) */
  sessionId: string;
  /** Session.expires ISO string — 클라이언트 카운트다운에 그대로 전달 */
  expiresAt: string;
}

export async function ensureDemoSession(
  currentPath: string,
): Promise<DemoSessionInfo | null> {
  if (process.env.DEMO_MODE !== 'true') return null;
  if (currentPath.startsWith(DEMO_BOOTSTRAP_PATH)) return null;

  // `getCachedSession`이 React `cache()`로 같은 요청 내 호출을 dedup.
  // `getCurrentUser`/`requireAuth`도 같은 헬퍼를 사용하므로 admin layout의
  // ensureDemoSession + requireAuth = 2 DB 쿼리가 1-쿼리로 통합된다.
  const session = await getCachedSession();
  if (session) {
    demo.enterWith({ sessionId: session.user.sessionId });

    // 5% 확률로 만료 sessionId 일괄 정리 — 응답 송신 후 실행되어 visitor latency 0
    if (Math.random() < LAZY_CLEANUP_PROBABILITY) {
      after(async () => {
        try {
          await cleanupExpiredSessions(); // DB만 — Storage는 cron이 처리
        } catch (err) {
          console.error('[Demo Lazy Cleanup]', err);
        }
      });
    }

    return {
      sessionId: session.user.sessionId,
      expiresAt: session.expires.toISOString(),
    };
  }

  redirect(demoBootstrapPath(currentPath));
}
