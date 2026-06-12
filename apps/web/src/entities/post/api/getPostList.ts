import { cache } from 'react';

import { prisma } from '@simple-cms/db';
import type { Prisma } from '@simple-cms/db';
import { extractFirstImageFromTiptap } from '@simple-cms/editor';

const DEFAULT_PAGE_SIZE = 20;

export const getPublishedPosts = cache(
  async (
    boardId: string,
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
    query?: string,
  ) => {
    const skip = (page - 1) * pageSize;
    const normalizedQuery = query?.trim();
    const where = {
      boardId,
      status: 'PUBLISHED',
      ...(normalizedQuery
        ? {
            OR: [
              { title: { contains: normalizedQuery } },
              { content: { contains: normalizedQuery } },
            ],
          }
        : {}),
    } satisfies Prisma.PostWhereInput;

    const [items, total, regularTotal] = await Promise.all([
      prisma.post.findMany({
        where,
        select: {
          id: true,
          title: true,
          slug: true,
          isImportant: true,
          publishedAt: true,
          contentJson: true,
          featuredImage: { select: { url: true, alt: true } },
          author: { select: { name: true } },
        },
        orderBy: [{ isImportant: 'desc' }, { publishedAt: 'desc' }],
        skip,
        take: pageSize,
      }),
      prisma.post.count({ where }),
      prisma.post.count({
        where: {
          ...where,
          isImportant: false,
        },
      }),
    ]);

    return {
      items: items.map((item) => {
        const fallbackImage = extractFirstImageFromTiptap(item.contentJson);
        const thumbnailUrl =
          item.featuredImage?.url ?? fallbackImage?.src ?? null;
        const thumbnailAlt =
          item.featuredImage?.alt ??
          fallbackImage?.alt ??
          `${item.title} 썸네일`;

        return {
          id: item.id,
          title: item.title,
          slug: item.slug,
          isImportant: item.isImportant,
          publishedAt: item.publishedAt,
          author: item.author,
          thumbnailUrl,
          thumbnailAlt: thumbnailUrl ? thumbnailAlt : null,
        };
      }),
      total,
      regularTotal,
      totalPages: Math.ceil(total / pageSize),
      page,
      pageSize,
    };
  },
);
