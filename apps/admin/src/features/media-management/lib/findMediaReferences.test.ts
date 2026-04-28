import { describe, it, expect } from 'vitest';

import { containsMediaReference } from './findMediaReferences';

const TARGET = 'media-id-abc';
const OTHER = 'media-id-xyz';

describe('containsMediaReference', () => {
  it('null → false', () => {
    expect(containsMediaReference(null, TARGET)).toBe(false);
  });

  it('undefined → false', () => {
    expect(containsMediaReference(undefined, TARGET)).toBe(false);
  });

  it('원시값 → false', () => {
    expect(containsMediaReference('string', TARGET)).toBe(false);
    expect(containsMediaReference(42, TARGET)).toBe(false);
  });

  it('빈 객체 → false', () => {
    expect(containsMediaReference({}, TARGET)).toBe(false);
  });

  it('image 노드 + 일치하는 mediaId → true', () => {
    const node = { type: 'image', attrs: { mediaId: TARGET } };
    expect(containsMediaReference(node, TARGET)).toBe(true);
  });

  it('image 노드 + 다른 mediaId → false', () => {
    const node = { type: 'image', attrs: { mediaId: OTHER } };
    expect(containsMediaReference(node, TARGET)).toBe(false);
  });

  it('image 노드 + mediaId null → false', () => {
    const node = { type: 'image', attrs: { mediaId: null } };
    expect(containsMediaReference(node, TARGET)).toBe(false);
  });

  it('image 노드 + attrs 없음 → false', () => {
    const node = { type: 'image' };
    expect(containsMediaReference(node, TARGET)).toBe(false);
  });

  it('non-image 노드 → false', () => {
    const node = { type: 'paragraph', attrs: { mediaId: TARGET } };
    expect(containsMediaReference(node, TARGET)).toBe(false);
  });

  it('doc → paragraph → image 중첩 (일치) → true', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'image', attrs: { mediaId: TARGET } },
          ],
        },
      ],
    };
    expect(containsMediaReference(doc, TARGET)).toBe(true);
  });

  it('doc → paragraph → image 중첩 (불일치) → false', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'image', attrs: { mediaId: OTHER } },
          ],
        },
      ],
    };
    expect(containsMediaReference(doc, TARGET)).toBe(false);
  });

  it('형제 노드 중 하나만 일치 → true', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'image', attrs: { mediaId: OTHER } },
        { type: 'image', attrs: { mediaId: TARGET } },
        { type: 'image', attrs: { mediaId: OTHER } },
      ],
    };
    expect(containsMediaReference(doc, TARGET)).toBe(true);
  });

  it('형제 노드 모두 불일치 → false', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'image', attrs: { mediaId: OTHER } },
        { type: 'text', text: 'hello' },
      ],
    };
    expect(containsMediaReference(doc, TARGET)).toBe(false);
  });

  it('3depth 중첩 일치 → true', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                { type: 'image', attrs: { mediaId: TARGET } },
              ],
            },
          ],
        },
      ],
    };
    expect(containsMediaReference(doc, TARGET)).toBe(true);
  });
});
