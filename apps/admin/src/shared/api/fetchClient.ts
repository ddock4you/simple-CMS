import { DEMO_ADMIN_BASE_PATH, demoAdminApiPath } from '@simple-cms/types';

export class FetchError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
    this.name = 'FetchError';
  }
}

function isDemoAdminBrowserPath(): boolean {
  if (typeof window === 'undefined') return false;
  const { pathname } = window.location;
  return (
    pathname === DEMO_ADMIN_BASE_PATH ||
    pathname.startsWith(`${DEMO_ADMIN_BASE_PATH}/`)
  );
}

function shouldUseDemoAdminBasePath(): boolean {
  if (typeof window !== 'undefined') return isDemoAdminBrowserPath();
  return process.env.DEMO_MODE === 'true';
}

export function resolveAdminApiPath(path: string): string {
  if (!path.startsWith('/api/')) return path;
  if (!shouldUseDemoAdminBasePath()) return path;
  return demoAdminApiPath(path);
}

function getBaseUrl(): string {
  if (typeof window !== 'undefined') return '';
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001';
}

export async function fetchClient<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = `${getBaseUrl()}${resolveAdminApiPath(path)}`;

  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  const body = await response.json();

  if (!response.ok) {
    throw new FetchError(
      body.error ?? '요청 처리에 실패했습니다.',
      response.status,
      typeof body.code === 'string' ? body.code : undefined,
    );
  }

  return body.data as T;
}
