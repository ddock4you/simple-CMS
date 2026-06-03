import { describe, expect, it } from 'vitest';

import { IMAGE_BLOCK_MAX_ITEMS } from '@simple-cms/types';

import { imageBlockConfigSchema } from './blockSchemas';

describe('imageBlockConfigSchema', () => {
  it('accepts legacy single image config', () => {
    const result = imageBlockConfigSchema.safeParse({
      imageUrl: '/uploads/a.jpg',
      imageAlt: 'A image',
      imageMediaId: 'media-a',
      caption: null,
      linkUrl: null,
    });

    expect(result.success).toBe(true);
  });

  it('accepts multi image items config', () => {
    const result = imageBlockConfigSchema.safeParse({
      items: [
        { imageUrl: '/uploads/a.jpg', imageAlt: 'A image', imageMediaId: 'a' },
        { imageUrl: '/uploads/b.jpg', imageAlt: 'B image', imageMediaId: 'b' },
      ],
    });

    expect(result.success).toBe(true);
  });

  it('rejects item without alt text', () => {
    const result = imageBlockConfigSchema.safeParse({
      items: [{ imageUrl: '/uploads/a.jpg', imageAlt: '' }],
    });

    expect(result.success).toBe(false);
  });

  it('rejects items over max count', () => {
    const result = imageBlockConfigSchema.safeParse({
      items: Array.from({ length: IMAGE_BLOCK_MAX_ITEMS + 1 }, (_, index) => ({
        imageUrl: `/uploads/${index}.jpg`,
        imageAlt: `Image ${index}`,
      })),
    });

    expect(result.success).toBe(false);
  });
});
