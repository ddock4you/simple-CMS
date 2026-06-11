import type { MetadataRoute } from 'next';

import {
  buildDemoRobotsMetadata,
  buildRobotsMetadata,
} from '@/shared/lib/seo/robots';
import { getSiteUrl } from '@/shared/lib/siteUrl';
import { getCachedSeo } from '@/shared/lib/seoCache';

export const dynamic = 'force-dynamic';

export default async function robots(): Promise<MetadataRoute.Robots> {
  if (process.env.DEMO_MODE === 'true') {
    return buildDemoRobotsMetadata();
  }

  const [baseUrl, seo] = await Promise.all([getSiteUrl(), getCachedSeo()]);

  return buildRobotsMetadata({ baseUrl, seo });
}
