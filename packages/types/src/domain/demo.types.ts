export const DEMO_ADMIN_BASE_PATH = '/_cms/admin' as const;
export const DEMO_BOOTSTRAP_PATH = '/demo-bootstrap' as const;
export const DEMO_SESSION_COOKIE_NAME = 'session-token' as const;

export function demoAdminApiPath(path: string): string {
  if (path === DEMO_ADMIN_BASE_PATH) return path;
  if (path.startsWith(`${DEMO_ADMIN_BASE_PATH}/`)) return path;

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${DEMO_ADMIN_BASE_PATH}${normalizedPath}`;
}

export function demoBootstrapPath(nextPath?: string): string {
  if (!nextPath) return DEMO_BOOTSTRAP_PATH;
  return `${DEMO_BOOTSTRAP_PATH}?next=${encodeURIComponent(nextPath)}`;
}

export function stripDemoAdminBasePath(path: string): string {
  if (path === DEMO_ADMIN_BASE_PATH) return '/';
  if (path.startsWith(`${DEMO_ADMIN_BASE_PATH}/`)) {
    return path.slice(DEMO_ADMIN_BASE_PATH.length) || '/';
  }
  return path;
}
