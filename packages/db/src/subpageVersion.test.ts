import { describe, it, expect } from 'vitest';

import {
  normalizeLabel,
  collectMediaIdsFromTiptapNode,
  collectMediaIdsFromSnapshot,
} from './subpageVersion';

import type { SubpageSnapshotPayload } from './subpageVersion';

describe('normalizeLabel', () => {
  it('null → null', () => {
    expect(normalizeLabel(null)).toBeNull();
  });

  it('undefined → null', () => {
    expect(normalizeLabel(undefined)).toBeNull();
  });

  it('빈 문자열 → null', () => {
    expect(normalizeLabel('')).toBeNull();
  });

  it('공백만 있는 문자열 → null', () => {
    expect(normalizeLabel('   ')).toBeNull();
  });

  it('앞뒤 공백 제거 후 반환', () => {
    expect(normalizeLabel('  버전 메모  ')).toBe('버전 메모');
  });

  it('내부 공백은 유지', () => {
    expect(normalizeLabel('1단계 완료 후 저장')).toBe('1단계 완료 후 저장');
  });
});

describe('collectMediaIdsFromTiptapNode', () => {
  it('null → []', () => {
    expect(collectMediaIdsFromTiptapNode(null)).toEqual([]);
  });

  it('undefined → []', () => {
    expect(collectMediaIdsFromTiptapNode(undefined)).toEqual([]);
  });

  it('원시값 → []', () => {
    expect(collectMediaIdsFromTiptapNode('string')).toEqual([]);
    expect(collectMediaIdsFromTiptapNode(42)).toEqual([]);
  });

  it('빈 객체 → []', () => {
    expect(collectMediaIdsFromTiptapNode({})).toEqual([]);
  });

  it('image 노드 + mediaId string → [mediaId]', () => {
    const node = { type: 'image', attrs: { mediaId: 'media-abc' } };
    expect(collectMediaIdsFromTiptapNode(node)).toEqual(['media-abc']);
  });

  it('image 노드 + mediaId null → []', () => {
    const node = { type: 'image', attrs: { mediaId: null } };
    expect(collectMediaIdsFromTiptapNode(node)).toEqual([]);
  });

  it('image 노드 + attrs 없음 → []', () => {
    const node = { type: 'image' };
    expect(collectMediaIdsFromTiptapNode(node)).toEqual([]);
  });

  it('non-image 노드 + mediaId → []', () => {
    const node = { type: 'paragraph', attrs: { mediaId: 'media-abc' } };
    expect(collectMediaIdsFromTiptapNode(node)).toEqual([]);
  });

  it('doc → paragraph → image 중첩 → [mediaId]', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'image', attrs: { mediaId: 'media-abc' } },
          ],
        },
      ],
    };
    expect(collectMediaIdsFromTiptapNode(doc)).toEqual(['media-abc']);
  });

  it('형제 image 노드 여러 개 → 모두 수집', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'image', attrs: { mediaId: 'id-1' } },
        { type: 'text', text: 'hello' },
        { type: 'image', attrs: { mediaId: 'id-2' } },
      ],
    };
    expect(collectMediaIdsFromTiptapNode(doc)).toEqual(['id-1', 'id-2']);
  });

  it('3depth 중첩 → 수집 (재귀 보장)', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                { type: 'image', attrs: { mediaId: 'deep-media' } },
              ],
            },
          ],
        },
      ],
    };
    expect(collectMediaIdsFromTiptapNode(doc)).toEqual(['deep-media']);
  });

  it('중복 mediaId도 그대로 수집 (dedup 없음)', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'image', attrs: { mediaId: 'same-id' } },
        { type: 'image', attrs: { mediaId: 'same-id' } },
      ],
    };
    expect(collectMediaIdsFromTiptapNode(doc)).toEqual(['same-id', 'same-id']);
  });
});

describe('collectMediaIdsFromSnapshot', () => {
  const emptyMeta = {
    title: 'Test',
    slug: 'test',
    seoTitle: null,
    seoDescription: null,
    status: 'DRAFT' as const,
    cclType: null,
    cclAi: false,
    feedbackEnabled: false,
    featuredImageId: null,
    displayOrder: 0,
  };

  it('블록 없음 → []', () => {
    const snapshot: SubpageSnapshotPayload = { meta: emptyMeta, blocks: [] };
    expect(collectMediaIdsFromSnapshot(snapshot)).toEqual([]);
  });

  it('IMAGE 블록 + imageMediaId → [imageMediaId]', () => {
    const snapshot: SubpageSnapshotPayload = {
      meta: emptyMeta,
      blocks: [
        {
          blockType: 'IMAGE',
          configJson: { imageMediaId: 'img-media-1' },
          isVisible: true,
          displayOrder: 0,
        },
      ],
    };
    expect(collectMediaIdsFromSnapshot(snapshot)).toEqual(['img-media-1']);
  });

  it('IMAGE 블록 + imageMediaId null → []', () => {
    const snapshot: SubpageSnapshotPayload = {
      meta: emptyMeta,
      blocks: [
        {
          blockType: 'IMAGE',
          configJson: { imageMediaId: null },
          isVisible: true,
          displayOrder: 0,
        },
      ],
    };
    expect(collectMediaIdsFromSnapshot(snapshot)).toEqual([]);
  });

  it('RICH_TEXT 블록 + Tiptap image 노드 → [mediaId]', () => {
    const snapshot: SubpageSnapshotPayload = {
      meta: emptyMeta,
      blocks: [
        {
          blockType: 'RICH_TEXT',
          configJson: {
            contentJson: {
              type: 'doc',
              content: [
                { type: 'image', attrs: { mediaId: 'rt-media-1' } },
              ],
            },
          },
          isVisible: true,
          displayOrder: 0,
        },
      ],
    };
    expect(collectMediaIdsFromSnapshot(snapshot)).toEqual(['rt-media-1']);
  });

  it('RICH_TEXT 블록 + contentJson 없음 → []', () => {
    const snapshot: SubpageSnapshotPayload = {
      meta: emptyMeta,
      blocks: [
        {
          blockType: 'RICH_TEXT',
          configJson: {},
          isVisible: true,
          displayOrder: 0,
        },
      ],
    };
    expect(collectMediaIdsFromSnapshot(snapshot)).toEqual([]);
  });

  it('HTML/IFRAME 블록 → skip (수집 대상 아님)', () => {
    const snapshot: SubpageSnapshotPayload = {
      meta: emptyMeta,
      blocks: [
        {
          blockType: 'HTML',
          configJson: { html: '<p>hello</p>' },
          isVisible: true,
          displayOrder: 0,
        },
        {
          blockType: 'IFRAME',
          configJson: { src: 'https://www.youtube.com/embed/abc' },
          isVisible: true,
          displayOrder: 1,
        },
      ],
    };
    expect(collectMediaIdsFromSnapshot(snapshot)).toEqual([]);
  });

  it('IMAGE + RICH_TEXT 혼합 → 모두 수집', () => {
    const snapshot: SubpageSnapshotPayload = {
      meta: emptyMeta,
      blocks: [
        {
          blockType: 'IMAGE',
          configJson: { imageMediaId: 'img-1' },
          isVisible: true,
          displayOrder: 0,
        },
        {
          blockType: 'RICH_TEXT',
          configJson: {
            contentJson: {
              type: 'doc',
              content: [
                { type: 'image', attrs: { mediaId: 'rt-1' } },
                { type: 'image', attrs: { mediaId: 'rt-2' } },
              ],
            },
          },
          isVisible: true,
          displayOrder: 1,
        },
      ],
    };
    expect(collectMediaIdsFromSnapshot(snapshot)).toEqual(['img-1', 'rt-1', 'rt-2']);
  });
});
