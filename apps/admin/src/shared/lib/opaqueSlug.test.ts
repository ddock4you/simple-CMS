import { describe, expect, it, vi } from 'vitest';

import { prisma } from '@simple-cms/db';

vi.mock('@simple-cms/db', () => ({
  prisma: {
    subpage: { findFirst: vi.fn() },
    post: { findFirst: vi.fn() },
  },
}));

import {
  createUniquePostSlug,
  createUniqueSubpageSlug,
  generateOpaqueSlug,
} from './opaqueSlug';

describe('generateOpaqueSlug', () => {
  it('generates opaque subpage slugs', () => {
    expect(generateOpaqueSlug('p')).toMatch(/^p-[a-f0-9]{16}$/);
  });

  it('generates opaque post slugs', () => {
    expect(generateOpaqueSlug('post')).toMatch(/^post-[a-f0-9]{16}$/);
  });

  it('does not derive the slug from title-like content', () => {
    const slug = generateOpaqueSlug('p');

    expect(slug).not.toContain('hello');
    expect(slug).not.toContain('title');
  });

  it('retries when a subpage slug already exists', async () => {
    const findFirst = vi.mocked(prisma.subpage.findFirst);
    findFirst
      .mockResolvedValueOnce({ id: 'existing' } as never)
      .mockResolvedValueOnce(null);

    await expect(createUniqueSubpageSlug()).resolves.toMatch(/^p-[a-f0-9]{16}$/);
    expect(findFirst).toHaveBeenCalledTimes(2);
  });

  it('checks post slug uniqueness within the target board', async () => {
    const findFirst = vi.mocked(prisma.post.findFirst);
    findFirst.mockResolvedValueOnce(null);

    await expect(createUniquePostSlug('board-1')).resolves.toMatch(
      /^post-[a-f0-9]{16}$/,
    );
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        boardId: 'board-1',
        slug: expect.stringMatching(/^post-[a-f0-9]{16}$/),
      },
    });
  });
});
