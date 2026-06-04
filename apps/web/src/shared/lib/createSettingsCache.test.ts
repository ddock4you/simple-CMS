import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  currentSessionId: '__PROD__',
}));

vi.mock('@simple-cms/db', () => ({
  demo: {
    PROD_SENTINEL: '__PROD__',
    getCurrentSessionId: () => mocks.currentSessionId,
  },
}));

import { createSettingsCache } from './createSettingsCache';

describe('createSettingsCache', () => {
  const originalDemoMode = process.env.DEMO_MODE;

  beforeEach(() => {
    process.env.DEMO_MODE = originalDemoMode;
    mocks.currentSessionId = '__PROD__';
  });

  it('keeps separate cache entries per demo session', async () => {
    process.env.DEMO_MODE = 'true';
    const fetcher = vi
      .fn<() => Promise<string>>()
      .mockResolvedValueOnce('visitor-a-data')
      .mockResolvedValueOnce('visitor-b-data');
    const cache = createSettingsCache({ fetcher });

    mocks.currentSessionId = 'visitor-a';
    await expect(cache.get()).resolves.toBe('visitor-a-data');
    await expect(cache.get()).resolves.toBe('visitor-a-data');

    mocks.currentSessionId = 'visitor-b';
    await expect(cache.get()).resolves.toBe('visitor-b-data');

    mocks.currentSessionId = 'visitor-a';
    await expect(cache.get()).resolves.toBe('visitor-a-data');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('uses the production sentinel cache key outside demo mode', async () => {
    process.env.DEMO_MODE = 'false';
    const fetcher = vi.fn<() => Promise<string>>().mockResolvedValue('prod-data');
    const cache = createSettingsCache({ fetcher });

    mocks.currentSessionId = 'visitor-a';
    await expect(cache.get()).resolves.toBe('prod-data');
    mocks.currentSessionId = 'visitor-b';
    await expect(cache.get()).resolves.toBe('prod-data');

    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
