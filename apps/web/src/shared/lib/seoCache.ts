import { getSiteSetting } from '@simple-cms/db';
import { SITE_SETTING_KEYS } from '@simple-cms/types';

import { createSettingsCache } from './createSettingsCache';

/**
 * SEO 관련 SiteSettings 캐시 (Stage 9).
 *
 * `createSettingsCache` 공통 팩토리 — 인메모리 60s prod / 5s dev TTL.
 * admin → web 별 인스턴스라 즉시 invalidate 불가. TTL 만료 후 자연 갱신.
 */
export interface SeoSettings {
  /** robots.txt에 `/api/` 외로 추가할 Disallow 경로 */
  robotsAdditionalDisallow: string[];
}

const FALLBACK: SeoSettings = {
  robotsAdditionalDisallow: [],
};

const seoCache = createSettingsCache({
  fetcher: async (): Promise<SeoSettings> => {
    const raw = await getSiteSetting(SITE_SETTING_KEYS.ROBOTS_ADDITIONAL_DISALLOW);

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
        // Malformed JSON — 폴백 (robots.txt 서빙 차단 금지)
      }
    }

    return { robotsAdditionalDisallow };
  },
  onError: (err) => {
    console.error('[seoCache] fetch failed, returning fallback:', err);
    return FALLBACK;
  },
});

export const getCachedSeo = () => seoCache.get();

export const invalidateSeoCache = () => seoCache.invalidate();
