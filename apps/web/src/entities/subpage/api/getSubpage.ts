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
    publishedAt: true;
    updatedAt: true;
    blocks: {
      select: {
        id: true;
        blockType: true;
        configJson: true;
        displayOrder: true;
      };
    };
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
        publishedAt: true,
        updatedAt: true,
        blocks: {
          where: { isVisible: true },
          orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
          select: {
            id: true,
            blockType: true,
            configJson: true,
            displayOrder: true,
          },
        },
      },
    });
  },
);
