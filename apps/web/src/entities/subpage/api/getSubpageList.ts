import { cache } from 'react';

import { prisma } from '@simple-cms/db';

export const getRecentSubpages = cache(async (limit = 5) => {
  return prisma.subpage.findMany({
    where: {
      status: 'PUBLISHED',
    },
    select: {
      id: true,
      title: true,
      slug: true,
      seoDescription: true,
      publishedAt: true,
    },
    orderBy: {
      publishedAt: 'desc',
    },
    take: limit,
  });
});
