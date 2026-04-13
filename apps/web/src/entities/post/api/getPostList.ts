import { cache } from 'react';

import { prisma } from '@simple-cms/db';

const DEFAULT_PAGE_SIZE = 20;

export const getPublishedPosts = cache(
  async (boardId: string, page = 1, pageSize = DEFAULT_PAGE_SIZE) => {
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      prisma.post.findMany({
        where: {
          boardId,
          status: 'PUBLISHED',
        },
        select: {
          id: true,
          title: true,
          slug: true,
          publishedAt: true,
          author: { select: { name: true } },
        },
        orderBy: { publishedAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.post.count({
        where: {
          boardId,
          status: 'PUBLISHED',
        },
      }),
    ]);

    return {
      items,
      total,
      totalPages: Math.ceil(total / pageSize),
      page,
      pageSize,
    };
  },
);
