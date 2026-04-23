import { getSiteSettings, prisma } from '@simple-cms/db';

/**
 * 공개 웹 브랜딩 데이터 (Stage 7l).
 *
 * SiteSettings 6개 키 + 3개 Media join 결과를 인메모리 캐시.
 * `domainCache.ts` 동일 패턴 — admin → web 인메모리 무효화는 별 인스턴스라 불가능.
 * TTL(60s prod / 5s dev) 만료 후 자연 갱신. UI/CLAUDE.md에 "최대 1분 후 반영" 명시.
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

const TTL_MS = process.env.NODE_ENV === 'production' ? 60_000 : 5_000;

let cache: { data: Branding; fetchedAt: number } | null = null;

const FALLBACK: Branding = {
  siteName: 'Simple CMS',
  siteDescription: '공개 웹',
  logoUrl: null,
  logoAlt: 'Simple CMS',
  faviconUrl: null,
  faviconMediaId: null,
  ogImageUrl: null,
};

export async function getCachedBranding(): Promise<Branding> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < TTL_MS) {
    return cache.data;
  }

  try {
    const values = await getSiteSettings([
      'SITE_NAME',
      'SITE_DESCRIPTION',
      'SITE_LOGO_MEDIA_ID',
      'SITE_LOGO_ALT',
      'SITE_FAVICON_MEDIA_ID',
      'SITE_OG_IMAGE_MEDIA_ID',
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
    const data: Branding = {
      siteName,
      siteDescription:
        values.SITE_DESCRIPTION?.trim() || FALLBACK.siteDescription,
      logoUrl: values.SITE_LOGO_MEDIA_ID
        ? urlByMediaId.get(values.SITE_LOGO_MEDIA_ID) ?? null
        : null,
      logoAlt: values.SITE_LOGO_ALT?.trim() || siteName,
      faviconUrl: values.SITE_FAVICON_MEDIA_ID
        ? urlByMediaId.get(values.SITE_FAVICON_MEDIA_ID) ?? null
        : null,
      faviconMediaId: values.SITE_FAVICON_MEDIA_ID,
      ogImageUrl: values.SITE_OG_IMAGE_MEDIA_ID
        ? urlByMediaId.get(values.SITE_OG_IMAGE_MEDIA_ID) ?? null
        : null,
    };

    cache = { data, fetchedAt: now };
    return data;
  } catch (err) {
    console.error('[brandingCache] fetch failed, returning fallback:', err);
    // 캐시는 갱신하지 않음 — 다음 요청에서 재시도
    return FALLBACK;
  }
}

/** 테스트/개발 환경에서 강제 무효화용. 운영은 TTL 만료 자연 갱신. */
export function invalidateBrandingCache(): void {
  cache = null;
}
