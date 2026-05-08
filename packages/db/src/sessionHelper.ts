import { randomUUID } from 'node:crypto';

import { prisma } from './client';

// 시연 모드: 1시간 TTL — visitor 만료 시 layout gate가 splash로 보내 새 세션 발급.
// 운영: 30일.
// admin/src/shared/lib/cookies.ts의 SESSION_MAX_AGE와 동일 분기 — 한쪽만 바꾸면
// cookie ↔ DB 만료 불일치 (브라우저는 cookie 살아있는데 DB validateSession이 만료 처리).
const SESSION_MAX_AGE_MS =
  process.env.DEMO_MODE === 'true'
    ? 60 * 60 * 1000
    : 30 * 24 * 60 * 60 * 1000;

export async function createSession(
  userId: string,
  options?: { ipAddress?: string; userAgent?: string },
) {
  const sessionToken = randomUUID();
  const expires = new Date(Date.now() + SESSION_MAX_AGE_MS);

  return prisma.session.create({
    data: {
      sessionToken,
      userId,
      expires,
      ipAddress: options?.ipAddress ?? null,
      userAgent: options?.userAgent ?? null,
    },
  });
}

export async function validateSession(sessionToken: string) {
  const session = await prisma.session.findUnique({
    where: { sessionToken },
  });

  if (!session) return null;

  if (session.expires < new Date()) {
    await prisma.session
      .delete({ where: { id: session.id } })
      .catch(() => null);
    return null;
  }

  return session;
}

export async function getSessionUser(sessionToken: string) {
  const session = await prisma.session.findUnique({
    where: { sessionToken },
    include: {
      user: {
        include: { role: true },
      },
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

  return session.user;
}

export async function deleteSession(sessionToken: string) {
  await prisma.session
    .delete({ where: { sessionToken } })
    .catch(() => null);
}

export async function deleteUserSessions(userId: string) {
  const result = await prisma.session.deleteMany({ where: { userId } });
  return result.count;
}

export async function deleteExpiredSessions() {
  const result = await prisma.session.deleteMany({
    where: { expires: { lt: new Date() } },
  });
  return result.count;
}

export async function countUserSessions(userId: string) {
  return prisma.session.count({
    where: { userId, expires: { gt: new Date() } },
  });
}
