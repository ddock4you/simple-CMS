/**
 * 시연 모드(DEMO_MODE) admin layout gate.
 *
 * 진입 흐름:
 *   - DEMO_MODE !== 'true' → no-op (운영 환경 영향 0)
 *   - currentPath가 splash 자체(/demo-bootstrap*) → no-op (self-loop 회피)
 *   - cookie 'session-token' 있음 + 유효 + ACTIVE → demo.enterWith({sessionId}) 부착 후 return
 *   - 그 외 → `/demo-bootstrap?next={path}` redirect
 *
 * `enterWith`로 부착한 sessionId는 같은 async tree의 모든 후속 await에 적용되어
 * Prisma extension이 자동 격리한다.
 */
import { redirect } from 'next/navigation';

import { demo, prisma } from '@simple-cms/db';

import { getSessionCookie } from '@/shared/lib/cookies';

const BOOTSTRAP_PATH_PREFIX = '/demo-bootstrap';

export async function ensureDemoSession(currentPath: string): Promise<void> {
  if (process.env.DEMO_MODE !== 'true') return;
  if (currentPath.startsWith(BOOTSTRAP_PATH_PREFIX)) return;

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
      return;
    }
  }

  redirect(
    `${BOOTSTRAP_PATH_PREFIX}?next=${encodeURIComponent(currentPath)}`,
  );
}
