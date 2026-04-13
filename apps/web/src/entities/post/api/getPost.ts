import { cache } from 'react';

import type { Prisma } from '@simple-cms/db';
import { prisma } from '@simple-cms/db';

type PublishedPost = Prisma.PostGetPayload<{
  select: {
    id: true;
    title: true;
    slug: true;
    contentJson: true;
    publishedAt: true;
    updatedAt: true;
    board: { select: { name: true; slug: true } };
    author: { select: { name: true } };
  };
}>;

export const getPublishedPost = cache(
  async (boardId: string, postSlug: string): Promise<PublishedPost | null> => {
    return prisma.post.findFirst({
      where: {
        boardId,
        slug: postSlug,
        status: 'PUBLISHED',
      },
      select: {
        id: true,
        title: true,
        slug: true,
        contentJson: true,
        publishedAt: true,
        updatedAt: true,
        board: { select: { name: true, slug: true } },
        author: { select: { name: true } },
      },
    });
  },
);
