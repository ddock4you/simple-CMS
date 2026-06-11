import { describe, expect, it } from 'vitest';

import { buildDemoSitemap, buildPublicSitemap } from './sitemap';

describe('sitemap builders', () => {
  const now = new Date('2026-01-03T00:00:00.000Z');

  it('builds the demo sitemap entry', () => {
    expect(buildDemoSitemap({ baseUrl: 'https://example.com', now })).toEqual([
      {
        url: 'https://example.com',
        lastModified: now,
        changeFrequency: 'daily',
        priority: 0.1,
      },
    ]);
  });

  it('builds public sitemap entries with existing priorities', () => {
    const updatedAt = new Date('2026-01-02T00:00:00.000Z');
    const publishedAt = new Date('2026-01-01T00:00:00.000Z');

    expect(
      buildPublicSitemap({
        baseUrl: 'https://example.com',
        now,
        subpages: [{ slug: 'about', updatedAt, publishedAt }],
        boards: [{ slug: 'notice', updatedAt }],
        posts: [
          {
            slug: 'post-1',
            updatedAt,
            publishedAt,
            board: { slug: 'notice' },
          },
        ],
      }),
    ).toEqual([
      {
        url: 'https://example.com',
        lastModified: now,
        changeFrequency: 'daily',
        priority: 1,
      },
      {
        url: 'https://example.com/p/about',
        lastModified: updatedAt,
        changeFrequency: 'monthly',
        priority: 0.8,
      },
      {
        url: 'https://example.com/board/notice',
        lastModified: updatedAt,
        changeFrequency: 'weekly',
        priority: 0.7,
      },
      {
        url: 'https://example.com/board/notice/post-1',
        lastModified: updatedAt,
        changeFrequency: 'weekly',
        priority: 0.6,
      },
    ]);
  });
});
