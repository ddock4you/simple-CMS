import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SessionUser } from '@/entities/auth/model/auth.types';

const mocks = vi.hoisted(() => ({
  runWith: vi.fn(),
}));

vi.mock('@simple-cms/db', () => ({
  demo: { runWith: mocks.runWith },
}));

import { runWithUserDemoSession } from './runWithUserDemoSession';

function makeUser(sessionId: string): SessionUser {
  return { id: 'user-1', sessionId } as unknown as SessionUser;
}

describe('runWithUserDemoSession', () => {
  const originalDemoMode = process.env.DEMO_MODE;

  beforeEach(() => {
    mocks.runWith.mockReset();
    process.env.DEMO_MODE = originalDemoMode;
  });

  it('runs directly outside demo mode', async () => {
    process.env.DEMO_MODE = 'false';
    const fn = vi.fn().mockResolvedValue('ok');

    await expect(runWithUserDemoSession(makeUser('__PROD__'), fn)).resolves.toBe(
      'ok',
    );

    expect(fn).toHaveBeenCalledOnce();
    expect(mocks.runWith).not.toHaveBeenCalled();
  });

  it('runs inside the authenticated user session in demo mode', async () => {
    process.env.DEMO_MODE = 'true';
    const fn = vi.fn().mockResolvedValue('ok');
    mocks.runWith.mockImplementationOnce(
      async (_context: unknown, callback: () => Promise<unknown>) => callback(),
    );

    await expect(runWithUserDemoSession(makeUser('visitor-1'), fn)).resolves.toBe(
      'ok',
    );

    expect(mocks.runWith).toHaveBeenCalledWith(
      { sessionId: 'visitor-1' },
      fn,
    );
  });
});
