import { randomUUID } from 'node:crypto';

import { prisma } from './client';

const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

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
