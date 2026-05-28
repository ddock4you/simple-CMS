import { getSiteSettings, prisma } from '@simple-cms/db';
import { SITE_SETTING_KEYS } from '@simple-cms/types';

import { createSettingsCache } from './createSettingsCache';

/**
 * 공개 웹 브랜딩 데이터 (Stage 7l).
 *
 * SiteSettings 6개 키 + 3개 Media join 결과를 인메모리 캐시.
 * admin → web 별 인스턴스라 즉시 invalidate 불가.
 * TTL 만료 후 자연 갱신. UI/AGENTS.md에 "최대 1분 후 반영" 명시.
 */
export interface Branding {
  siteName: string;
  /** 메타데이터 description. 미설정 시 '공개 웹' 폴백 */
  siteDescription: string;
  logoUrl: string | null;
  /** sr-only/접근성용. logoAlt 미설정 시 siteName 폴백 */
  logoAlt: string;
  faviconUrl: string | null;
  /** favicon cache busting용 (?v=mediaId). 같은 바이너리는 mediaId가 같으니 무효화 발생 안 함 — 의도적 */
  faviconMediaId: string | null;
  ogImageUrl: string | null;
}

const FALLBACK: Branding = {
  siteName: 'Simple CMS',
  siteDescription: '공개 웹',
  logoUrl: null,
  logoAlt: 'Simple CMS',
  faviconUrl: null,
  faviconMediaId: null,
  ogImageUrl: null,
};

const brandingCache = createSettingsCache({
  fetcher: async (): Promise<Branding> => {
    const values = await getSiteSettings([
      SITE_SETTING_KEYS.SITE_NAME,
      SITE_SETTING_KEYS.SITE_DESCRIPTION,
      SITE_SETTING_KEYS.SITE_LOGO_MEDIA_ID,
      SITE_SETTING_KEYS.SITE_LOGO_ALT,
      SITE_SETTING_KEYS.SITE_FAVICON_MEDIA_ID,
      SITE_SETTING_KEYS.SITE_OG_IMAGE_MEDIA_ID,
    ]);

    const mediaIds = [
      values.SITE_LOGO_MEDIA_ID,
      values.SITE_FAVICON_MEDIA_ID,
      values.SITE_OG_IMAGE_MEDIA_ID,
    ].filter((v): v is string => Boolean(v));

    let urlByMediaId = new Map<string, string>();
    if (mediaIds.length > 0) {
      const medias = await prisma.media.findMany({
        where: { id: { in: mediaIds } },
        select: { id: true, url: true },
      });
      urlByMediaId = new Map(medias.map((m) => [m.id, m.url]));
    }

    const siteName = values.SITE_NAME?.trim() || FALLBACK.siteName;
    return {
      siteName,
      siteDescription:
        values.SITE_DESCRIPTION?.trim() || FALLBACK.siteDescription,
      logoUrl: values.SITE_LOGO_MEDIA_ID
        ? (urlByMediaId.get(values.SITE_LOGO_MEDIA_ID) ?? null)
        : null,
      logoAlt: values.SITE_LOGO_ALT?.trim() || siteName,
      faviconUrl: values.SITE_FAVICON_MEDIA_ID
        ? (urlByMediaId.get(values.SITE_FAVICON_MEDIA_ID) ?? null)
        : null,
      faviconMediaId: values.SITE_FAVICON_MEDIA_ID,
      ogImageUrl: values.SITE_OG_IMAGE_MEDIA_ID
        ? (urlByMediaId.get(values.SITE_OG_IMAGE_MEDIA_ID) ?? null)
        : null,
    };
  },
  onError: (err) => {
    console.error('[brandingCache] fetch failed, returning fallback:', err);
    return FALLBACK;
  },
});

export const getCachedBranding = () => brandingCache.get();

/** 테스트/개발 환경에서 강제 무효화용. 운영은 TTL 만료 자연 갱신. */
export const invalidateBrandingCache = () => brandingCache.invalidate();
