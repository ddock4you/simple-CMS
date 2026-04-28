import { describe, it, expect } from 'vitest';
import type { PermissionMap } from '@simple-cms/types';
import { NAV_MAIN, NAV_GROUPS } from '@/shared/config/navigation';
import { getVisibleMenuItems } from './sidebarPermissions';

interface SidebarUser {
  role: { isSystem: boolean; permissions: unknown } | null;
}

function makeUser(permissions: PermissionMap = {}, isSystem = false): SidebarUser {
  return { role: { isSystem, permissions } };
}

describe('getVisibleMenuItems', () => {
  it('null 사용자 → main은 NAV_MAIN, groups는 빈 배열', () => {
    const result = getVisibleMenuItems(null);
    expect(result.main).toBe(NAV_MAIN);
    expect(result.groups).toEqual([]);
  });

  it('role이 null인 사용자 → groups 빈 배열', () => {
    const result = getVisibleMenuItems({ role: null });
    expect(result.main).toBe(NAV_MAIN);
    expect(result.groups).toEqual([]);
  });

  it('isSystem 사용자 → NAV_GROUPS 전체 반환', () => {
    const result = getVisibleMenuItems(makeUser({}, true));
    expect(result.main).toBe(NAV_MAIN);
    expect(result.groups).toBe(NAV_GROUPS);
  });

  it('subpages:read만 있으면 콘텐츠 그룹에 서브 페이지 1건, 시스템 그룹 제외', () => {
    const result = getVisibleMenuItems(makeUser({ subpages: { read: true } }));

    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].label).toBe('콘텐츠');
    expect(result.groups[0].items).toHaveLength(1);
    expect(result.groups[0].items[0].resource).toBe('subpages');
  });

  it('subpages:read + users:read → 두 그룹 각 1건', () => {
    const result = getVisibleMenuItems(
      makeUser({ subpages: { read: true }, users: { read: true } }),
    );

    expect(result.groups).toHaveLength(2);

    const contentGroup = result.groups.find((g) => g.label === '콘텐츠');
    const systemGroup = result.groups.find((g) => g.label === '시스템');

    expect(contentGroup?.items).toHaveLength(1);
    expect(contentGroup?.items[0].resource).toBe('subpages');

    expect(systemGroup?.items).toHaveLength(1);
    expect(systemGroup?.items[0].resource).toBe('users');
  });
});
