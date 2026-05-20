import type { MetadataRoute } from 'next';

import { getSiteUrl } from '@/shared/lib/siteUrl';
import { getCachedSeo } from '@/shared/lib/seoCache';

export const dynamic = 'force-dynamic';

const DEFAULT_DISALLOW: string[] = ['/api/'];

export default async function robots(): Promise<MetadataRoute.Robots> {
  if (process.env.DEMO_MODE === 'true') {
    return {
      rules: { userAgent: '*', disallow: '/' },
    };
  }

  const [baseUrl, seo] = await Promise.all([getSiteUrl(), getCachedSeo()]);

  const disallow = Array.from(
    new Set<string>([...DEFAULT_DISALLOW, ...seo.robotsAdditionalDisallow]),
  );

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow,
    },
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
