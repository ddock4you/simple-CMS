import { getSiteSetting } from '@simple-cms/db';

const TTL_MS = process.env.NODE_ENV === 'production' ? 60_000 : 5_000;

let cache: { domain: string | null; fetchedAt: number } | null = null;

export async function getCachedDomain(): Promise<string | null> {
  const now = Date.now();

  if (cache && now - cache.fetchedAt < TTL_MS) {
    return cache.domain;
  }

  const domain = await getSiteSetting('SITE_DOMAIN');
  cache = { domain: domain || null, fetchedAt: now };
  return cache.domain;
}

export function invalidateDomainCache(): void {
  cache = null;
}
