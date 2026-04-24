import { getSiteSetting } from '@simple-cms/db';

/**
 * SEO 관련 SiteSettings 캐시 (Stage 9 Phase 1).
 *
 * `brandingCache.ts`/`domainCache.ts` 동일 패턴 — 인메모리 60s prod / 5s dev TTL.
 * admin → web 별 인스턴스라 즉시 invalidate 불가. TTL 만료 후 자연 갱신.
 */
export interface SeoSettings {
  /** robots.txt에 `/api/` 외로 추가할 Disallow 경로 */
  robotsAdditionalDisallow: string[];
}

const TTL_MS = process.env.NODE_ENV === 'production' ? 60_000 : 5_000;

let cache: { data: SeoSettings; fetchedAt: number } | null = null;

const FALLBACK: SeoSettings = {
  robotsAdditionalDisallow: [],
};

export async function getCachedSeo(): Promise<SeoSettings> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < TTL_MS) {
    return cache.data;
  }

  try {
    const raw = await getSiteSetting('ROBOTS_ADDITIONAL_DISALLOW');

    let robotsAdditionalDisallow: string[] = [];
    if (raw) {
      try {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          robotsAdditionalDisallow = parsed.filter(
            (p): p is string => typeof p === 'string' && p.trim().length > 0,
          );
        }
      } catch {
        // Malformed JSON — 폴백 (운영자가 JSON 파싱 실패한 값을 set해도 robots.txt 서빙 차단 금지)
      }
    }

    const data: SeoSettings = { robotsAdditionalDisallow };
    cache = { data, fetchedAt: now };
    return data;
  } catch (err) {
    console.error('[seoCache] fetch failed, returning fallback:', err);
    return FALLBACK;
  }
}

export function invalidateSeoCache(): void {
  cache = null;
}
