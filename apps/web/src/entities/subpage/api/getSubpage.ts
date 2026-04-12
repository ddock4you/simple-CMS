import { cache } from 'react';

import type { Prisma } from '@simple-cms/db';
import { prisma } from '@simple-cms/db';

type PublishedSubpage = Prisma.SubpageGetPayload<{
  select: {
    id: true;
    title: true;
    slug: true;
    seoTitle: true;
    seoDescription: true;
    contentJson: true;
    publishedAt: true;
    updatedAt: true;
  };
}>;

export const getPublishedSubpage = cache(
  async (slug: string): Promise<PublishedSubpage | null> => {
    return prisma.subpage.findFirst({
      where: {
        slug,
        status: 'PUBLISHED',
      },
      select: {
        id: true,
        title: true,
        slug: true,
        seoTitle: true,
        seoDescription: true,
        contentJson: true,
        publishedAt: true,
        updatedAt: true,
      },
    });
  },
);
