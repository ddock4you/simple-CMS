import { describe, expect, it } from 'vitest';

import type { Post } from '@simple-cms/db';

import { buildPostPatchDiff } from './buildPostPatchDiff';

const basePost = {
  id: 'post-1',
  title: '기존 제목',
  slug: 'old-title',
  boardId: 'board-1',
  seoTitle: null,
  seoDescription: null,
  contentJson: null,
  content: null,
  status: 'DRAFT',
  isImportant: false,
  publishedAt: null,
  featuredImageId: null,
  authorId: null,
  displayOrder: 0,
  createdAt: new Date('2026-06-01T00:00:00.000Z'),
  updatedAt: new Date('2026-06-01T00:00:00.000Z'),
  sessionId: '__PROD__',
} satisfies Post;

describe('buildPostPatchDiff', () => {
  it('records featured image changes', () => {
    expect(
      buildPostPatchDiff({ featuredImageId: 'media-1' }, basePost),
    ).toEqual({
      before: { featuredImageId: null },
      after: { featuredImageId: 'media-1' },
    });
  });

  it('records featured image removal', () => {
    expect(
      buildPostPatchDiff(
        { featuredImageId: null },
        { ...basePost, featuredImageId: 'media-1' },
      ),
    ).toEqual({
      before: { featuredImageId: 'media-1' },
      after: { featuredImageId: null },
    });
  });
});
