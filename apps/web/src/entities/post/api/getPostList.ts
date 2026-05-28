import { cache } from 'react';

import { prisma } from '@simple-cms/db';

const DEFAULT_PAGE_SIZE = 20;

export const getPublishedPosts = cache(
  async (boardId: string, page = 1, pageSize = DEFAULT_PAGE_SIZE) => {
    const skip = (page - 1) * pageSize;

    const [items, total, regularTotal] = await Promise.all([
      prisma.post.findMany({
        where: {
          boardId,
          status: 'PUBLISHED',
        },
        select: {
          id: true,
          title: true,
          slug: true,
          isImportant: true,
          publishedAt: true,
          author: { select: { name: true } },
        },
        orderBy: [{ isImportant: 'desc' }, { publishedAt: 'desc' }],
        skip,
        take: pageSize,
      }),
      prisma.post.count({
        where: {
          boardId,
          status: 'PUBLISHED',
        },
      }),
      prisma.post.count({
        where: {
          boardId,
          status: 'PUBLISHED',
          isImportant: false,
        },
      }),
    ]);

    return {
      items,
      total,
      regularTotal,
      totalPages: Math.ceil(total / pageSize),
      page,
      pageSize,
    };
  },
);
