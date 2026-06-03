import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  enterWith: vi.fn(),
  getCachedSession: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

vi.mock('@simple-cms/db', () => ({
  demo: { enterWith: mocks.enterWith },
}));

vi.mock('@/shared/lib/cachedSession', () => ({
  getCachedSession: mocks.getCachedSession,
}));

import { getCurrentUser } from './getCurrentUser';

describe('getCurrentUser', () => {
  const originalDemoMode = process.env.DEMO_MODE;

  beforeEach(() => {
    mocks.enterWith.mockReset();
    mocks.getCachedSession.mockReset();
    process.env.DEMO_MODE = originalDemoMode;
  });

  it('returns null when no cached session exists', async () => {
    mocks.getCachedSession.mockResolvedValueOnce(null);

    await expect(getCurrentUser()).resolves.toBeNull();
    expect(mocks.enterWith).not.toHaveBeenCalled();
  });

  it('attaches demo session context when DEMO_MODE is true', async () => {
    process.env.DEMO_MODE = 'true';
    mocks.getCachedSession.mockResolvedValueOnce({
      user: {
        id: 'user-1',
        username: 'demo_admin',
        password: 'hashed-password',
        sessionId: 'visitor-session-1',
        role: null,
      },
    });

    const user = await getCurrentUser();

    expect(mocks.enterWith).toHaveBeenCalledWith({
      sessionId: 'visitor-session-1',
    });
    expect(user).toMatchObject({
      id: 'user-1',
      username: 'demo_admin',
      sessionId: 'visitor-session-1',
    });
    expect(user).not.toHaveProperty('password');
  });

  it('does not attach demo session context outside DEMO_MODE', async () => {
    process.env.DEMO_MODE = 'false';
    mocks.getCachedSession.mockResolvedValueOnce({
      user: {
        id: 'user-1',
        username: 'admin',
        password: 'hashed-password',
        sessionId: '__PROD__',
        role: null,
      },
    });

    await getCurrentUser();

    expect(mocks.enterWith).not.toHaveBeenCalled();
  });
});
