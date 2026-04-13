import { cache } from 'react';

import type { Prisma } from '@simple-cms/db';
import { prisma } from '@simple-cms/db';

type PublishedBoard = Prisma.BoardGetPayload<{
  select: {
    id: true;
    name: true;
    slug: true;
    description: true;
    skinType: true;
  };
}>;

export const getPublishedBoard = cache(
  async (slug: string): Promise<PublishedBoard | null> => {
    return prisma.board.findFirst({
      where: {
        slug,
        isPublic: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        skinType: true,
      },
    });
  },
);
