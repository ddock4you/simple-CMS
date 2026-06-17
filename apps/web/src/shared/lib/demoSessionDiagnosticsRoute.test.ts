import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  diagnostics: {
    active: true,
    sessionId: 'visitor-a',
    currentSessionId: 'visitor-a',
    expiresAt: '2026-06-04T01:00:00.000Z',
    counts: {
      users: 1,
      roles: 2,
      siteSettings: 3,
      navigationMenus: 4,
      homeSections: 5,
      subpages: 6,
      boards: 7,
      posts: 8,
      media: 9,
    },
    settings: {
      brandingMediaIds: {
        logo: null,
        favicon: null,
        ogImage: null,
        footerLogo: null,
      },
      resolvedMedia: {
        logo: true,
        favicon: true,
        ogImage: true,
        footerLogo: true,
      },
    },
    search: null,
  },
  requestSession: {
    sessionId: 'visitor-a',
    expiresAt: new Date('2026-06-04T01:00:00.000Z'),
  } as { sessionId: string; expiresAt: Date } | null,
  buildDemoSessionDiagnostics: vi.fn(),
  runWithRequestDemoSession: vi.fn(),
}));

vi.mock('@/shared/lib/demoSessionDiagnostics', () => ({
  buildDemoSessionDiagnostics: mocks.buildDemoSessionDiagnostics,
}));

vi.mock('@/shared/lib/requestDemoSession', () => ({
  runWithRequestDemoSession: mocks.runWithRequestDemoSession,
}));

import { GET } from '../../../app/api/demo/session-diagnostics/route';

const ORIGINAL_DEMO_MODE = process.env.DEMO_MODE;
const ORIGINAL_DEMO_SESSION_DEBUG = process.env.DEMO_SESSION_DEBUG;
const ORIGINAL_CRON_SECRET = process.env.CRON_SECRET;

function setEnv(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
    return;
  }
  process.env[key] = value;
}

function restoreEnv(): void {
  setEnv('DEMO_MODE', ORIGINAL_DEMO_MODE);
  setEnv('DEMO_SESSION_DEBUG', ORIGINAL_DEMO_SESSION_DEBUG);
  setEnv('CRON_SECRET', ORIGINAL_CRON_SECRET);
}

function diagnosticsRequest(headers?: HeadersInit): Request {
  return new Request('http://localhost/api/demo/session-diagnostics?q=공지', {
    headers,
  });
}

describe('GET /api/demo/session-diagnostics', () => {
  beforeEach(() => {
    process.env.DEMO_MODE = 'true';
    delete process.env.DEMO_SESSION_DEBUG;
    delete process.env.CRON_SECRET;
    mocks.requestSession = {
      sessionId: 'visitor-a',
      expiresAt: new Date('2026-06-04T01:00:00.000Z'),
    };
    mocks.buildDemoSessionDiagnostics.mockReset();
    mocks.buildDemoSessionDiagnostics.mockResolvedValue(mocks.diagnostics);
    mocks.runWithRequestDemoSession.mockReset();
    mocks.runWithRequestDemoSession.mockImplementation(
      async (
        _request: Request,
        fn: (
          session: { sessionId: string; expiresAt: Date } | null,
        ) => Promise<Response>,
      ) => fn(mocks.requestSession),
    );
  });

  afterEach(() => {
    restoreEnv();
  });

  it('returns hidden 404 outside demo mode without querying diagnostics', async () => {
    process.env.DEMO_MODE = 'false';

    const response = await GET(diagnosticsRequest());

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
    });
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(mocks.runWithRequestDemoSession).not.toHaveBeenCalled();
    expect(mocks.buildDemoSessionDiagnostics).not.toHaveBeenCalled();
  });

  it('requires debug flag or cron bearer token before session lookup', async () => {
    const response = await GET(diagnosticsRequest());

    expect(response.status).toBe(404);
    expect(mocks.runWithRequestDemoSession).not.toHaveBeenCalled();
    expect(mocks.buildDemoSessionDiagnostics).not.toHaveBeenCalled();
  });

  it('allows diagnostics when DEMO_SESSION_DEBUG is enabled', async () => {
    process.env.DEMO_SESSION_DEBUG = 'true';

    const response = await GET(diagnosticsRequest());

    expect(response.status).toBe(200);
    expect(response.headers.get('X-Demo-Session-Id')).toBe('visitor-a');
    expect(response.headers.get('X-Demo-Current-Session-Id')).toBe('visitor-a');
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: { sessionId: 'visitor-a' },
    });
    expect(mocks.runWithRequestDemoSession).toHaveBeenCalledTimes(1);
    expect(mocks.buildDemoSessionDiagnostics).toHaveBeenCalledWith(
      mocks.requestSession,
      '공지',
    );
  });

  it('allows diagnostics with a matching cron bearer token', async () => {
    process.env.CRON_SECRET = 'secret-token';

    const response = await GET(
      diagnosticsRequest({ authorization: 'Bearer secret-token' }),
    );

    expect(response.status).toBe(200);
    expect(mocks.runWithRequestDemoSession).toHaveBeenCalledTimes(1);
    expect(mocks.buildDemoSessionDiagnostics).toHaveBeenCalledTimes(1);
  });

  it('rejects a non-matching cron bearer token', async () => {
    process.env.CRON_SECRET = 'secret-token';

    const response = await GET(
      diagnosticsRequest({ authorization: 'Bearer wrong-token' }),
    );

    expect(response.status).toBe(404);
    expect(mocks.runWithRequestDemoSession).not.toHaveBeenCalled();
    expect(mocks.buildDemoSessionDiagnostics).not.toHaveBeenCalled();
  });

  it('returns 401 after authorization when no demo session is active', async () => {
    process.env.DEMO_SESSION_DEBUG = 'true';
    mocks.requestSession = null;
    mocks.buildDemoSessionDiagnostics.mockResolvedValue({
      active: false,
      sessionId: null,
      currentSessionId: '__PROD__',
      expiresAt: null,
      counts: null,
      settings: null,
      search: null,
    });

    const response = await GET(diagnosticsRequest());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: { active: false, sessionId: null },
    });
    expect(response.headers.get('X-Demo-Session-Id')).toBe('none');
  });
});
