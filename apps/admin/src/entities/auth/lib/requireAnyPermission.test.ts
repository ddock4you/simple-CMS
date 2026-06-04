import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { PermissionMap } from '@simple-cms/types';
import type { SessionUser } from '@/entities/auth/model/auth.types';

vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) =>
      new Response(JSON.stringify(body), {
        status: init?.status ?? 200,
        headers: { 'Content-Type': 'application/json' },
      }),
  },
}));

vi.mock('@simple-cms/db', () => ({
  demo: { enterWith: vi.fn() },
}));

vi.mock('@/entities/auth/lib/getCurrentUser');

import { demo } from '@simple-cms/db';
import { getCurrentUser } from '@/entities/auth/lib/getCurrentUser';
import { requireAnyPermission } from './requireAnyPermission';

function makeUser(permissions: PermissionMap = {}, isSystem = false): SessionUser {
  return {
    id: 'test-user-id',
    sessionId: 'visitor-session-id',
    role: { isSystem, permissions: permissions as unknown },
  } as unknown as SessionUser;
}

describe('requireAnyPermission', () => {
  const originalDemoMode = process.env.DEMO_MODE;

  beforeEach(() => {
    vi.mocked(getCurrentUser).mockReset();
    vi.mocked(demo.enterWith).mockReset();
    process.env.DEMO_MODE = originalDemoMode;
  });

  afterEach(() => {
    process.env.DEMO_MODE = originalDemoMode;
  });

  it('미인증(getCurrentUser → null) → error.status 401', async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(null);

    const result = await requireAnyPermission([{ resource: 'subpages', action: 'read' }]);

    expect(result.user).toBeNull();
    expect(result.error).not.toBeNull();
    const status = (result.error as unknown as Response).status;
    expect(status).toBe(401);
  });

  it('주어진 권한이 모두 없으면 403', async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(
      makeUser({ subpages: { read: false }, posts: { read: false } }),
    );

    const result = await requireAnyPermission([
      { resource: 'subpages', action: 'read' },
      { resource: 'posts', action: 'read' },
    ]);

    expect(result.user).toBeNull();
    expect(result.error).not.toBeNull();
    const status = (result.error as unknown as Response).status;
    expect(status).toBe(403);
  });

  it('권한 중 하나라도 있으면 user 반환', async () => {
    const user = makeUser({ subpages: { read: false }, posts: { read: true } });
    vi.mocked(getCurrentUser).mockResolvedValueOnce(user);

    const result = await requireAnyPermission([
      { resource: 'subpages', action: 'read' },
      { resource: 'posts', action: 'read' },
    ]);

    expect(result.error).toBeNull();
    expect(result.user).toBe(user);
  });

  it('DEMO_MODE=true이면 user.sessionId를 demo context에 부착', async () => {
    process.env.DEMO_MODE = 'true';
    const user = makeUser({ posts: { read: true } });
    vi.mocked(getCurrentUser).mockResolvedValueOnce(user);

    const result = await requireAnyPermission([{ resource: 'posts', action: 'read' }]);

    expect(result.error).toBeNull();
    expect(demo.enterWith).toHaveBeenCalledWith({ sessionId: 'visitor-session-id' });
  });
});
