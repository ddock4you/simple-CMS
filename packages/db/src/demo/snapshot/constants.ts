/**
 * Snapshot import constants kept separate from the large import flow so seed
 * user repair and row creation share one source of truth.
 */

/**
 * payload에 password 필드가 없는 User row를 시드 적재할 때 채울 placeholder.
 * 시드 User로는 로그인 못 하게 함 (verify 못 통과하는 random hash).
 * demo_admin User만 ensureDemoAdminSeed()가 실제 비밀번호로 다시 채운다.
 */
export const PLACEHOLDER_PASSWORD_HASH =
  '$2a$10$INVALIDhashINVALIDhashINVALIDhashINVALIDhashINVALIDhashIN';

export const DEMO_ADMIN_PASSWORD = 'demo_password';

export const DEMO_ADMIN_PERMISSIONS: Record<string, Record<string, boolean>> = {
  dashboard: { read: true },
  subpages: { create: true, read: true, update: true, delete: true },
  'subpage-feedback': { read: true, delete: true },
  boards: { create: true, read: true, update: true, delete: true },
  posts: { create: true, read: true, update: true, delete: true },
  navigation: { create: true, read: true, update: true, delete: true },
  home: { create: true, read: true, update: true, delete: true },
  'home-popups': { create: true, read: true, update: true, delete: true },
  media: { create: true, read: true, update: true, delete: true },
  users: { create: true, read: true, update: true, delete: true },
  roles: { create: true, read: true, update: true, delete: true },
  auditLogs: { read: true },
  errorLogs: { read: true, update: true },
  settings: { read: true, update: true },
  'demo-snapshot': { read: true, create: true, update: true },
};
