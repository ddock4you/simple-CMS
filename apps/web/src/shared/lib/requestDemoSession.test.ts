import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  cookieValue: null as string | null,
  findUnique: vi.fn(),
  runWith: vi.fn(),
  runWithBypass: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn((name: string) =>
      name === 'session-token' && mocks.cookieValue
        ? { value: mocks.cookieValue }
        : undefined,
    ),
  })),
}));

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
}));

vi.mock('@simple-cms/db', () => ({
  demo: {
    runWith: mocks.runWith,
    runWithBypass: mocks.runWithBypass,
  },
  prisma: {
    session: {
      findUnique: mocks.findUnique,
    },
  },
}));

import {
  getDemoSessionFromCookies,
  runWithDemoSessionFromCookies,
} from './requestDemoSession';

describe('requestDemoSession', () => {
  const originalDemoMode = process.env.DEMO_MODE;
  const originalDebug = process.env.DEMO_SESSION_DEBUG;

  beforeEach(() => {
    process.env.DEMO_MODE = 'true';
    process.env.DEMO_SESSION_DEBUG = originalDebug;
    mocks.cookieValue = null;
    mocks.findUnique.mockReset();
    mocks.runWith.mockReset();
    mocks.runWithBypass.mockReset();
    mocks.redirect.mockReset();
    mocks.runWith.mockImplementation(
      async (_ctx: unknown, fn: () => Promise<unknown>) => fn(),
    );
    mocks.runWithBypass.mockImplementation(async (fn: () => Promise<unknown>) =>
      fn(),
    );
    mocks.redirect.mockImplementation((url: string) => {
      throw Object.assign(new Error('NEXT_REDIRECT'), { url });
    });
  });

  afterEach(() => {
    process.env.DEMO_MODE = originalDemoMode;
    process.env.DEMO_SESSION_DEBUG = originalDebug;
  });

  it('returns null outside demo mode without reading a session', async () => {
    process.env.DEMO_MODE = 'false';

    await expect(getDemoSessionFromCookies()).resolves.toBeNull();

    expect(mocks.runWithBypass).not.toHaveBeenCalled();
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it('resolves the cookie-backed session in demo mode', async () => {
    const expiresAt = new Date(Date.now() + 60_000);
    mocks.cookieValue = 'token-a';
    mocks.findUnique.mockResolvedValue({
      expires: expiresAt,
      user: { status: 'ACTIVE', sessionId: 'visitor-a' },
    });

    await expect(getDemoSessionFromCookies()).resolves.toEqual({
      sessionId: 'visitor-a',
      expiresAt,
    });

    expect(mocks.findUnique).toHaveBeenCalledWith({
      where: { sessionToken: 'token-a' },
      include: { user: true },
    });
  });

  it('runs callback inside the visitor demo session scope', async () => {
    const expiresAt = new Date(Date.now() + 60_000);
    mocks.cookieValue = 'token-a';
    mocks.findUnique.mockResolvedValue({
      expires: expiresAt,
      user: { status: 'ACTIVE', sessionId: 'visitor-a' },
    });

    await expect(
      runWithDemoSessionFromCookies('/search?q=test', async (session) => {
        expect(session?.sessionId).toBe('visitor-a');
        return 'ok';
      }),
    ).resolves.toBe('ok');

    expect(mocks.runWith).toHaveBeenCalledWith(
      { sessionId: 'visitor-a' },
      expect.any(Function),
    );
  });

  it('redirects required demo pages without a valid session', async () => {
    await expect(
      runWithDemoSessionFromCookies('/search?q=test', async () => 'unreachable', {
        required: true,
      }),
    ).rejects.toMatchObject({
      url: '/demo-bootstrap?next=%2Fsearch%3Fq%3Dtest',
    });

    expect(mocks.runWith).not.toHaveBeenCalled();
  });

  it('lets the bootstrap page render without requiring a session', async () => {
    await expect(
      runWithDemoSessionFromCookies('/demo-bootstrap?next=%2F', async (session) => {
        expect(session).toBeNull();
        return 'bootstrap';
      }, { required: true }),
    ).resolves.toBe('bootstrap');

    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(mocks.runWith).not.toHaveBeenCalled();
  });
});
