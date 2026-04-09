import { redirect } from 'next/navigation';

import { getSessionUser } from '@simple-cms/db';

import { getSessionCookie } from '@/shared/lib/cookies';
import type { SessionUser } from '@/entities/auth/model/auth.types';

export async function getCurrentUser(): Promise<SessionUser | null> {
  const sessionToken = await getSessionCookie();
  if (!sessionToken) return null;

  const user = await getSessionUser(sessionToken);
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
