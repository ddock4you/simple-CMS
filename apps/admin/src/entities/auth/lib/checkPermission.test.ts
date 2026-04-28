import { describe, it, expect } from 'vitest';
import type { PermissionMap } from '@simple-cms/types';
import type { SessionUser } from '@/entities/auth/model/auth.types';
import { hasPermission } from './checkPermission';

function makeUser(permissions: PermissionMap = {}, isSystem = false): SessionUser {
  return {
    id: 'test-user-id',
    role: { isSystem, permissions: permissions as unknown },
  } as unknown as SessionUser;
}

describe('hasPermission', () => {
  it('null 사용자 → false', () => {
    expect(hasPermission(null, 'subpages', 'read')).toBe(false);
  });

  it('role이 null인 사용자 → false', () => {
    const user = { id: 'u1', role: null } as unknown as SessionUser;
    expect(hasPermission(user, 'subpages', 'read')).toBe(false);
  });

  it('isSystem=true → 모든 resource/action에 true', () => {
    const user = makeUser({}, true);
    expect(hasPermission(user, 'subpages', 'read')).toBe(true);
    expect(hasPermission(user, 'subpages', 'delete')).toBe(true);
    expect(hasPermission(user, 'users', 'create')).toBe(true);
    expect(hasPermission(user, 'settings', 'update')).toBe(true);
  });

  it('명시적 read:true → true', () => {
    const user = makeUser({ subpages: { read: true } });
    expect(hasPermission(user, 'subpages', 'read')).toBe(true);
  });

  it('명시적 read:false → false', () => {
    const user = makeUser({ subpages: { read: false } });
    expect(hasPermission(user, 'subpages', 'read')).toBe(false);
  });

  it('permissions에 해당 resource 없음 → false', () => {
    const user = makeUser({ boards: { read: true } });
    expect(hasPermission(user, 'subpages', 'read')).toBe(false);
  });

  it('resource는 있으나 해당 action 없음 → false', () => {
    const user = makeUser({ subpages: { read: true } });
    expect(hasPermission(user, 'subpages', 'delete')).toBe(false);
  });

  it('빈 permissions 객체 → false', () => {
    const user = makeUser({});
    expect(hasPermission(user, 'subpages', 'read')).toBe(false);
  });
});
