import { describe, expect, it } from 'vitest';

import { buildDemoRobotsMetadata, buildRobotsMetadata } from './robots';

describe('robots metadata builders', () => {
  it('blocks all crawlers in demo mode', () => {
    expect(buildDemoRobotsMetadata()).toEqual({
      rules: { userAgent: '*', disallow: '/' },
    });
  });

  it('dedupes default and configured disallow paths', () => {
    expect(
      buildRobotsMetadata({
        baseUrl: 'https://example.com',
        seo: { robotsAdditionalDisallow: ['/private/', '/api/'] },
      }),
    ).toEqual({
      rules: {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/private/'],
      },
      sitemap: 'https://example.com/sitemap.xml',
      host: 'https://example.com',
    });
  });
});
