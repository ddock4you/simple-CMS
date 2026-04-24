import { cache } from 'react';

import type { Prisma } from '@simple-cms/db';
import { prisma } from '@simple-cms/db';

type PublishedPost = Prisma.PostGetPayload<{
  select: {
    id: true;
    title: true;
    slug: true;
    seoTitle: true;
    seoDescription: true;
    contentJson: true;
    content: true;
    publishedAt: true;
    updatedAt: true;
    board: { select: { name: true; slug: true } };
    author: { select: { name: true } };
  };
}>;

type PreviewPost = Prisma.PostGetPayload<{
  select: {
    id: true;
    title: true;
    slug: true;
    seoTitle: true;
    seoDescription: true;
    contentJson: true;
    content: true;
    status: true;
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
        seoTitle: true,
        seoDescription: true,
        contentJson: true,
        content: true,
        publishedAt: true,
        updatedAt: true,
        board: { select: { name: true, slug: true } },
        author: { select: { name: true } },
      },
    });
  },
);

/**
 * 미리보기용 Post 조회.
 * - status 필터 없음(DRAFT 포함)
 * - board.isPublic 필터 없음(비공개 게시판의 게시글도 조회)
 *
 * 호출 측에서 preview 세션 검증(쿠키 + entityId 일치)을 먼저 수행해야 한다.
 */
export const getPostForPreview = cache(
  async (boardSlug: string, postSlug: string): Promise<PreviewPost | null> => {
    return prisma.post.findFirst({
      where: {
        slug: postSlug,
        board: { slug: boardSlug },
      },
      select: {
        id: true,
        title: true,
        slug: true,
        seoTitle: true,
        seoDescription: true,
        contentJson: true,
        content: true,
        status: true,
        publishedAt: true,
        updatedAt: true,
        board: { select: { name: true, slug: true } },
        author: { select: { name: true } },
      },
    });
  },
);
