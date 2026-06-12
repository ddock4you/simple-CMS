import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  headers: vi.fn(),
}));

vi.mock('next/headers', () => ({
  headers: mocks.headers,
}));

import { getCurrentPathname } from './getCurrentPathname';

describe('getCurrentPathname', () => {
  it('returns pathname with query string from proxy headers', async () => {
    mocks.headers.mockResolvedValueOnce(
      new Headers({
        'x-pathname': '/posts',
        'x-search': '?page=2&q=test',
      }),
    );

    await expect(getCurrentPathname()).resolves.toBe('/posts?page=2&q=test');
  });

  it('falls back to root when pathname header is missing', async () => {
    mocks.headers.mockResolvedValueOnce(new Headers());

    await expect(getCurrentPathname()).resolves.toBe('/');
  });
});
