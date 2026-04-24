import type { MetadataRoute } from 'next';

import { prisma } from '@simple-cms/db';

import { getSiteUrl } from '@/shared/lib/siteUrl';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = await getSiteUrl();
  const now = new Date();

  const [subpages, boards, posts] = await Promise.all([
    prisma.subpage.findMany({
      where: { status: 'PUBLISHED' },
      select: { slug: true, updatedAt: true, publishedAt: true },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.board.findMany({
      where: { isPublic: true },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.post.findMany({
      where: {
        status: 'PUBLISHED',
        board: { isPublic: true },
      },
      select: {
        slug: true,
        updatedAt: true,
        publishedAt: true,
        board: { select: { slug: true } },
      },
      orderBy: { updatedAt: 'desc' },
    }),
  ]);

  return [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    ...subpages.map((s) => ({
      url: `${baseUrl}/p/${s.slug}`,
      lastModified: s.updatedAt ?? s.publishedAt ?? now,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    ...boards.map((b) => ({
      url: `${baseUrl}/board/${b.slug}`,
      lastModified: b.updatedAt ?? now,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    ...posts.map((p) => ({
      url: `${baseUrl}/board/${p.board.slug}/${p.slug}`,
      lastModified: p.updatedAt ?? p.publishedAt ?? now,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
  ];
}
