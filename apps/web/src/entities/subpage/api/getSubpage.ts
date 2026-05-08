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
    cclType: true;
    cclAi: true;
    feedbackEnabled: true;
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

type PreviewSubpage = Prisma.SubpageGetPayload<{
  select: {
    id: true;
    title: true;
    slug: true;
    seoTitle: true;
    seoDescription: true;
    status: true;
    publishedAt: true;
    updatedAt: true;
    cclType: true;
    cclAi: true;
    feedbackEnabled: true;
    blocks: {
      select: {
        id: true;
        blockType: true;
        configJson: true;
        displayOrder: true;
        isVisible: true;
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
        cclType: true,
        cclAi: true,
        feedbackEnabled: true,
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

/**
 * 미리보기용 Subpage 조회.
 * - status 필터 없음(DRAFT 포함)
 * - block isVisible 필터 없음(숨김 블록도 표시)
 *
 * 호출 측에서 preview 세션 검증(쿠키 + entityId 일치)을 먼저 수행해야 한다.
 */
export const getSubpageForPreview = cache(
  async (slug: string): Promise<PreviewSubpage | null> => {
    return prisma.subpage.findFirst({
      where: { slug },
      select: {
        id: true,
        title: true,
        slug: true,
        seoTitle: true,
        seoDescription: true,
        status: true,
        publishedAt: true,
        updatedAt: true,
        cclType: true,
        cclAi: true,
        feedbackEnabled: true,
        blocks: {
          orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
          select: {
            id: true,
            blockType: true,
            configJson: true,
            displayOrder: true,
            isVisible: true,
          },
        },
      },
    });
  },
);
