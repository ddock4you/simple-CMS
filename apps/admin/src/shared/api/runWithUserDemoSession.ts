import { demo } from '@simple-cms/db';

import type { SessionUser } from '@/entities/auth/model/auth.types';

export function runWithUserDemoSession<T>(
  user: SessionUser,
  fn: () => Promise<T>,
): Promise<T> {
  if (process.env.DEMO_MODE !== 'true') return fn();
  return demo.runWith({ sessionId: user.sessionId }, fn);
}
