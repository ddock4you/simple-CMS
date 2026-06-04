import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { demo, prisma } from '@simple-cms/db';

const SESSION_COOKIE_NAME = 'session-token';
const BOOTSTRAP_PATH_PREFIX = '/demo-bootstrap';

export interface RequestDemoSession {
  sessionId: string;
  expiresAt: Date;
}

function readCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const prefix = `${name}=`;
  return (
    cookieHeader
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(prefix))
      ?.slice(prefix.length) ?? null
  );
}

async function findDemoSession(
  token: string | null | undefined,
): Promise<RequestDemoSession | null> {
  if (process.env.DEMO_MODE !== 'true') return null;
  if (!token) return null;

  const session = await demo.runWithBypass(() =>
    prisma.session.findUnique({
      where: { sessionToken: token },
      include: { user: true },
    }),
  );

  if (!session) return null;
  if (session.expires <= new Date()) return null;
  if (session.user.status !== 'ACTIVE') return null;

  return {
    sessionId: session.user.sessionId,
    expiresAt: session.expires,
  };
}

function toBootstrapPath(currentPath: string): string {
  return `${BOOTSTRAP_PATH_PREFIX}?next=${encodeURIComponent(currentPath)}`;
}

export async function enterDemoSessionFromCookies(): Promise<RequestDemoSession | null> {
  if (process.env.DEMO_MODE !== 'true') return null;
  const cookieStore = await cookies();
  const session = await findDemoSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  if (!session) return null;
  demo.enterWith({ sessionId: session.sessionId });
  return session;
}

export async function getDemoSessionFromCookies(): Promise<RequestDemoSession | null> {
  if (process.env.DEMO_MODE !== 'true') return null;
  const cookieStore = await cookies();
  return findDemoSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);
}

export async function runWithDemoSessionFromCookies<T>(
  currentPath: string,
  fn: (session: RequestDemoSession | null) => Promise<T>,
  options: { required?: boolean } = {},
): Promise<T> {
  if (process.env.DEMO_MODE !== 'true') {
    return fn(null);
  }

  if (currentPath.startsWith(BOOTSTRAP_PATH_PREFIX)) {
    return fn(null);
  }

  const session = await getDemoSessionFromCookies();
  if (!session) {
    if (options.required) {
      redirect(toBootstrapPath(currentPath));
    }
    return fn(null);
  }

  if (process.env.DEMO_SESSION_DEBUG === 'true') {
    console.info('[web demo session]', {
      path: currentPath,
      sessionId: session.sessionId,
    });
  }

  return demo.runWith({ sessionId: session.sessionId }, () => fn(session));
}

export async function runWithRequestDemoSession<T>(
  request: Request,
  fn: (session: RequestDemoSession | null) => Promise<T>,
): Promise<T> {
  if (process.env.DEMO_MODE !== 'true') {
    return fn(null);
  }

  const token = readCookie(request.headers.get('cookie'), SESSION_COOKIE_NAME);
  const session = await findDemoSession(token);
  if (!session) {
    return fn(null);
  }

  return demo.runWith({ sessionId: session.sessionId }, () => fn(session));
}
