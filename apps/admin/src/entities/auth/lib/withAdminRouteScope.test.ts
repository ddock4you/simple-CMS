import { NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SessionUser } from '@/entities/auth/model/auth.types';

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  requirePermission: vi.fn(),
  requireAnyPermission: vi.fn(),
  runWithUserDemoSession: vi.fn(),
}));

vi.mock('@/entities/auth/lib/getCurrentUser', () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock('@/entities/auth/lib/requirePermission', () => ({
  requirePermission: mocks.requirePermission,
}));

vi.mock('@/entities/auth/lib/requireAnyPermission', () => ({
  requireAnyPermission: mocks.requireAnyPermission,
}));

vi.mock('@/entities/auth/lib/runWithUserDemoSession', () => ({
  runWithUserDemoSession: mocks.runWithUserDemoSession,
}));

import {
  withAdminRouteScope,
  withAnyPermissionRoute,
  withPermissionRoute,
} from './withAdminRouteScope';

function makeUser(sessionId = 'visitor-1'): SessionUser {
  return { id: 'user-1', sessionId } as unknown as SessionUser;
}

describe('withAdminRouteScope', () => {
  beforeEach(() => {
    mocks.getCurrentUser.mockReset();
    mocks.requirePermission.mockReset();
    mocks.requireAnyPermission.mockReset();
    mocks.runWithUserDemoSession.mockReset();
    mocks.runWithUserDemoSession.mockImplementation(
      async (_user: SessionUser, fn: () => Promise<NextResponse>) => fn(),
    );
  });

  it('returns 401 for auth-only route without a user', async () => {
    mocks.getCurrentUser.mockResolvedValueOnce(null);
    const handler = withAdminRouteScope(async () =>
      NextResponse.json({ ok: true }),
    );

    const response = await handler(new Request('http://localhost/api/profile'));

    expect(response.status).toBe(401);
    expect(mocks.runWithUserDemoSession).not.toHaveBeenCalled();
  });

  it('runs auth-only route inside the authenticated demo session scope', async () => {
    const user = makeUser();
    mocks.getCurrentUser.mockResolvedValueOnce(user);
    const handler = withAdminRouteScope(async (_request, ctx) => {
      expect(ctx.user).toBe(user);
      return NextResponse.json({ ok: true });
    });

    const response = await handler(new Request('http://localhost/api/profile'));

    expect(response.status).toBe(200);
    expect(mocks.runWithUserDemoSession).toHaveBeenCalledWith(
      user,
      expect.any(Function),
    );
  });

  it('returns permission errors without entering route scope', async () => {
    const error = Response.json({ success: false }, { status: 403 });
    mocks.requirePermission.mockResolvedValueOnce({ user: null, error });
    const handler = withPermissionRoute('users', 'update', async () =>
      NextResponse.json({ ok: true }),
    );

    const response = await handler(new Request('http://localhost/api/users'));

    expect(response.status).toBe(403);
    expect(mocks.runWithUserDemoSession).not.toHaveBeenCalled();
  });

  it('runs static permission route in user demo scope', async () => {
    const user = makeUser('visitor-2');
    mocks.requirePermission.mockResolvedValueOnce({ user, error: null });
    const handler = withPermissionRoute(
      'users',
      'update',
      async (_request, ctx) => {
        expect(ctx.user.sessionId).toBe('visitor-2');
        return NextResponse.json({ ok: true });
      },
    );

    const response = await handler(new Request('http://localhost/api/users'));

    expect(response.status).toBe(200);
    expect(mocks.runWithUserDemoSession).toHaveBeenCalledWith(
      user,
      expect.any(Function),
    );
  });

  it('runs any-permission route in user demo scope', async () => {
    const user = makeUser('visitor-3');
    mocks.requireAnyPermission.mockResolvedValueOnce({ user, error: null });
    const handler = withAnyPermissionRoute(
      [{ resource: 'subpages', action: 'read' }],
      async (_request, ctx) => {
        expect(ctx.user.sessionId).toBe('visitor-3');
        return NextResponse.json({ ok: true });
      },
    );

    const response = await handler(new Request('http://localhost/api/search'));

    expect(response.status).toBe(200);
    expect(mocks.runWithUserDemoSession).toHaveBeenCalledWith(
      user,
      expect.any(Function),
    );
  });
});
