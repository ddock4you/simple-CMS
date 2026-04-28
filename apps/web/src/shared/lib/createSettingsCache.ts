const TTL_PROD_MS = 60_000;
const TTL_DEV_MS = 5_000;

/**
 * SiteSettings 인메모리 캐시 팩토리 (brandingCache / domainCache / seoCache 공용).
 *
 * - TTL: prod 60s / dev 5s
 * - onError 제공 시 fetcher 실패 → fallback 반환 (캐시 갱신 안 함 → 다음 요청에서 재시도)
 * - onError 미제공 시 fetcher 예외 그대로 전파
 */
export function createSettingsCache<T>(opts: {
  fetcher: () => Promise<T>;
  onError?: (err: unknown) => T;
}): { get: () => Promise<T>; invalidate: () => void } {
  const { fetcher, onError } = opts;
  const ttlMs =
    process.env.NODE_ENV === 'production' ? TTL_PROD_MS : TTL_DEV_MS;

  let cache: { data: T; fetchedAt: number } | null = null;

  return {
    async get(): Promise<T> {
      const now = Date.now();
      if (cache && now - cache.fetchedAt < ttlMs) {
        return cache.data;
      }

      if (onError) {
        try {
          const data = await fetcher();
          cache = { data, fetchedAt: now };
          return data;
        } catch (err) {
          return onError(err);
        }
      }

      const data = await fetcher();
      cache = { data, fetchedAt: now };
      return data;
    },

    invalidate(): void {
      cache = null;
    },
  };
}
