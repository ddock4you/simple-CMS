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

function getBaseUrl(): string {
  if (typeof window !== 'undefined') return '';
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001';
}

export async function fetchClient<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = `${getBaseUrl()}${path}`;

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
