import type { MetadataRoute } from 'next';

import { getBoardUrl, getHomeUrl, getPostUrl, getSubpageUrl } from './urls';

export function buildDemoSitemap(input: {
  baseUrl: string;
  now: Date;
}): MetadataRoute.Sitemap {
  return [
    {
      url: getHomeUrl(input.baseUrl),
      lastModified: input.now,
      changeFrequency: 'daily',
      priority: 0.1,
    },
  ];
}

export function buildPublicSitemap(input: {
  baseUrl: string;
  now: Date;
  subpages: Array<{
    slug: string;
    updatedAt: Date;
    publishedAt: Date | null;
  }>;
  boards: Array<{
    slug: string;
    updatedAt: Date;
  }>;
  posts: Array<{
    slug: string;
    updatedAt: Date;
    publishedAt: Date | null;
    board: { slug: string };
  }>;
}): MetadataRoute.Sitemap {
  const { baseUrl, now, subpages, boards, posts } = input;

  return [
    {
      url: getHomeUrl(baseUrl),
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    ...subpages.map((subpage) => ({
      url: getSubpageUrl(baseUrl, subpage.slug),
      lastModified: subpage.updatedAt ?? subpage.publishedAt ?? now,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    ...boards.map((board) => ({
      url: getBoardUrl(baseUrl, board.slug),
      lastModified: board.updatedAt ?? now,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    ...posts.map((post) => ({
      url: getPostUrl(baseUrl, post.board.slug, post.slug),
      lastModified: post.updatedAt ?? post.publishedAt ?? now,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
  ];
}
