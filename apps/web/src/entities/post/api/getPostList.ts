import { cache } from 'react';

import { prisma } from '@simple-cms/db';
import type { Prisma } from '@simple-cms/db';

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
      items,
      total,
      regularTotal,
      totalPages: Math.ceil(total / pageSize),
      page,
      pageSize,
    };
  },
);
