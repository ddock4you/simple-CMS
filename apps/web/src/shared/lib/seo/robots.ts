import type { MetadataRoute } from 'next';

import type { SeoSettings } from '@/shared/lib/seoCache';

const DEFAULT_DISALLOW: string[] = ['/api/'];

export function buildRobotsMetadata(input: {
  baseUrl: string;
  seo: SeoSettings;
}): MetadataRoute.Robots {
  const disallow = Array.from(
    new Set<string>([
      ...DEFAULT_DISALLOW,
      ...input.seo.robotsAdditionalDisallow,
    ]),
  );

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow,
    },
    sitemap: `${input.baseUrl}/sitemap.xml`,
    host: input.baseUrl,
  };
}

export function buildDemoRobotsMetadata(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', disallow: '/' },
  };
}
