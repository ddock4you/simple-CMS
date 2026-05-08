/**
 * 시연 모드(DEMO_MODE) web root layout gate.
 *
 * admin과 거의 동일하지만 cookies helper만 web 전용 read-only 버전을 사용.
 * web은 anonymous 공개 영역이라 인증 강제 없이 sessionId만 부착 가능하면 통과 — 부착 실패
 * 시에만 splash로 redirect.
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
