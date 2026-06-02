import { describe, expect, it } from 'vitest';

import { extractFirstImageFromTiptap } from './extractFirstImageFromTiptap';

describe('extractFirstImageFromTiptap', () => {
  it('returns null for empty content', () => {
    expect(extractFirstImageFromTiptap(null)).toBeNull();
    expect(
      extractFirstImageFromTiptap({ type: 'doc', content: [] }),
    ).toBeNull();
  });

  it('returns the first image node in document order', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'intro' }],
        },
        {
          type: 'image',
          attrs: { src: '/uploads/content/first.jpg', alt: '첫 이미지' },
        },
        {
          type: 'image',
          attrs: { src: '/uploads/content/second.jpg', alt: '두 번째 이미지' },
        },
      ],
    };

    expect(extractFirstImageFromTiptap(doc)).toEqual({
      src: '/uploads/content/first.jpg',
      alt: '첫 이미지',
    });
  });

  it('falls back to null alt when image alt is missing', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'image', attrs: { src: '/uploads/content/image.jpg' } },
      ],
    };

    expect(extractFirstImageFromTiptap(doc)).toEqual({
      src: '/uploads/content/image.jpg',
      alt: null,
    });
  });
});
