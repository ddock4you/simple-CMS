import { describe, it, expect, vi, beforeEach } from 'vitest';
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

vi.mock('@/entities/auth/lib/getCurrentUser');

import { requirePermission } from './requirePermission';
import { getCurrentUser } from '@/entities/auth/lib/getCurrentUser';

function makeUser(permissions: PermissionMap = {}, isSystem = false): SessionUser {
  return {
    id: 'test-user-id',
    role: { isSystem, permissions: permissions as unknown },
  } as unknown as SessionUser;
}

describe('requirePermission', () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockReset();
  });

  it('미인증(getCurrentUser → null) → error.status 401', async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(null);

    const result = await requirePermission('subpages', 'read');

    expect(result.user).toBeNull();
    expect(result.error).not.toBeNull();
    const status = (result.error as unknown as Response).status;
    expect(status).toBe(401);
  });

  it('인증됐으나 권한 없음 → error.status 403', async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(
      makeUser({ subpages: { read: false } }),
    );

    const result = await requirePermission('subpages', 'read');

    expect(result.user).toBeNull();
    expect(result.error).not.toBeNull();
    const status = (result.error as unknown as Response).status;
    expect(status).toBe(403);
  });

  it('isSystem 사용자 → error: null, user 반환', async () => {
    const sysUser = makeUser({}, true);
    vi.mocked(getCurrentUser).mockResolvedValueOnce(sysUser);

    const result = await requirePermission('subpages', 'delete');

    expect(result.error).toBeNull();
    expect(result.user).toBe(sysUser);
  });

  it('명시적 권한 있는 사용자 → error: null, user 반환', async () => {
    const permUser = makeUser({ subpages: { read: true } });
    vi.mocked(getCurrentUser).mockResolvedValueOnce(permUser);

    const result = await requirePermission('subpages', 'read');

    expect(result.error).toBeNull();
    expect(result.user).toBe(permUser);
  });
});
