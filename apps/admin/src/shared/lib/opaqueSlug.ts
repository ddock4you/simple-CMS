import { randomUUID } from 'node:crypto';

import { prisma } from '@simple-cms/db';

const RANDOM_SLUG_LENGTH = 16;
const MAX_SLUG_GENERATION_ATTEMPTS = 10;

export function generateOpaqueSlug(prefix: 'p' | 'post'): string {
  const token = randomUUID().replaceAll('-', '').slice(0, RANDOM_SLUG_LENGTH);
  return `${prefix}-${token}`;
}

export async function createUniqueSubpageSlug(): Promise<string> {
  for (let attempt = 0; attempt < MAX_SLUG_GENERATION_ATTEMPTS; attempt += 1) {
    const slug = generateOpaqueSlug('p');
    const existing = await prisma.subpage.findFirst({ where: { slug } });
    if (!existing) return slug;
  }

  throw new Error('Failed to generate unique subpage slug');
}

export async function createUniquePostSlug(boardId: string): Promise<string> {
  for (let attempt = 0; attempt < MAX_SLUG_GENERATION_ATTEMPTS; attempt += 1) {
    const slug = generateOpaqueSlug('post');
    const existing = await prisma.post.findFirst({ where: { boardId, slug } });
    if (!existing) return slug;
  }

  throw new Error('Failed to generate unique post slug');
}
