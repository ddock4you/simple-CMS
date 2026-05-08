/**
 * 시연 모드(DEMO_MODE) web root layout gate.
 *
 * admin과 거의 동일하지만 cookies helper만 web 전용 read-only 버전을 사용.
 * web은 anonymous 공개 영역이라 인증 강제 없이 sessionId만 부착 가능하면 통과 — 부착 실패
 * 시에만 splash로 redirect.
 *
 * 반환값: 성공 시 `{ sessionId, expiresAt }`, 그 외(no-op/redirect)는 null.
 * DemoBanner의 카운트다운은 expiresAt prop을 사용한다.
 *
 * Lazy cleanup: 5% 확률로 만료 정리를 `after()` 후크로 비동기 실행 — 응답 latency 0.
 *   Storage 정리는 cron(/_cms/admin/api/demo/cleanup)에서 처리하고 lazy는 DB만.
 */
import { redirect } from 'next/navigation';
import { after } from 'next/server';

import { demo, prisma, cleanupExpiredSessions } from '@simple-cms/db';

import { getSessionCookie } from '@/shared/lib/cookies';

const BOOTSTRAP_PATH_PREFIX = '/demo-bootstrap';
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
  if (currentPath.startsWith(BOOTSTRAP_PATH_PREFIX)) return null;

  const token = await getSessionCookie();
  if (token) {
    const session = await demo.runWithBypass(() =>
      prisma.session.findUnique({
        where: { sessionToken: token },
        include: { user: true },
      }),
    );
    if (
      session &&
      session.expires > new Date() &&
      session.user.status === 'ACTIVE'
    ) {
      demo.enterWith({ sessionId: session.user.sessionId });

      if (Math.random() < LAZY_CLEANUP_PROBABILITY) {
        after(async () => {
          try {
            await cleanupExpiredSessions();
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
  }

  redirect(
    `${BOOTSTRAP_PATH_PREFIX}?next=${encodeURIComponent(currentPath)}`,
  );
}
