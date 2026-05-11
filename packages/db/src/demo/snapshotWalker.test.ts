/**
 * snapshotWalker 단위 테스트 (DB 무관, pure logic).
 *
 * 위치별 field name 분기를 모두 커버:
 *   - HomeSection HERO `slides[].mediaId`
 *   - HomeSection RECOMMENDED `items[].mediaId`
 *   - HomeSection LATEST_POSTS `boardId` (top-level)
 *   - PageBlock IMAGE `imageMediaId` (field name 다름!)
 *   - PageBlock RICH_TEXT `contentJson` 재귀 → image.attrs.mediaId
 *   - HomePopup CONTENT `contentJson` 재귀
 *   - HomePopup IMAGE `contentJson` 무관 (popupType !== CONTENT)
 *   - Post.contentJson 재귀
 *   - SubpageVersion.snapshot meta + blocks 재귀
 */
import { describe, it, expect } from 'vitest';

import type { SnapshotPayload } from './snapshot.types';
import { walkSnapshotForRemap } from './snapshotWalker';

function emptyPayload(): SnapshotPayload {
  return {
    schemaVersion: 1,
    exportedAt: '2026-05-08T12:00:00.000Z',
    models: {
      Role: [],
      User: [],
      Media: [],
      SiteSettings: [],
      NavigationMenu: [],
      Board: [],
      HomeSection: [],
      Subpage: [],
      Post: [],
      PageBlock: [],
      HomePopup: [],
      NavigationMenuItem: [],
      SubpageVersion: [],
      SubpageFeedback: [],
    },
  };
}

describe('walkSnapshotForRemap — HomeSection', () => {
  it('HERO slides[].mediaId 재매핑', () => {
    const payload = emptyPayload();
    payload.models.HomeSection.push({
      id: 'sec-1',
      sectionType: 'HERO',
      title: 'test-section',
      configJson: {
        slides: [
          { imageUrl: '/u/a.jpg', imageAlt: 'a', title: 'A', mediaId: 'old-1' },
          { imageUrl: '/u/b.jpg', imageAlt: 'b', title: 'B', mediaId: 'old-2' },
        ],
        slideOptions: {},
      },
      isVisible: true,
      displayOrder: 0,
    });

    const mediaIdMap = new Map([
      ['old-1', 'new-1'],
      ['old-2', 'new-2'],
    ]);
    walkSnapshotForRemap(payload, mediaIdMap, 'mediaId');

    const cfg = payload.models.HomeSection[0]!.configJson as {
      slides: Array<{ mediaId: string }>;
    };
    expect(cfg.slides[0]!.mediaId).toBe('new-1');
    expect(cfg.slides[1]!.mediaId).toBe('new-2');
  });

  it('RECOMMENDED items[].mediaId 재매핑', () => {
    const payload = emptyPayload();
    payload.models.HomeSection.push({
      id: 'sec-2',
      sectionType: 'RECOMMENDED',
      title: 'test-section',
      configJson: {
        heading: 'Picks',
        items: [{ imageUrl: '/u/c.jpg', imageAlt: 'c', title: 'C', mediaId: 'm-3' }],
        slideOptions: {},
      },
      isVisible: true,
      displayOrder: 1,
    });

    walkSnapshotForRemap(payload, new Map([['m-3', 'm-new']]), 'mediaId');

    const cfg = payload.models.HomeSection[0]!.configJson as {
      items: Array<{ mediaId: string }>;
    };
    expect(cfg.items[0]!.mediaId).toBe('m-new');
  });

  it('LATEST_POSTS boardId 재매핑 (kind=boardId)', () => {
    const payload = emptyPayload();
    payload.models.HomeSection.push({
      id: 'sec-3',
      sectionType: 'LATEST_POSTS',
      title: 'test-section',
      configJson: {
        heading: '최신 공지',
        boardId: 'board-old',
        limit: 5,
      },
      isVisible: true,
      displayOrder: 2,
    });

    walkSnapshotForRemap(
      payload,
      new Map([['board-old', 'board-new']]),
      'boardId',
    );

    const cfg = payload.models.HomeSection[0]!.configJson as {
      boardId: string;
    };
    expect(cfg.boardId).toBe('board-new');
  });

  it('LATEST_POSTS boardId — kind=mediaId면 변경 안 됨', () => {
    const payload = emptyPayload();
    payload.models.HomeSection.push({
      id: 'sec-4',
      sectionType: 'LATEST_POSTS',
      title: 'test-section',
      configJson: { heading: 't', boardId: 'board-old', limit: 5 },
      isVisible: true,
      displayOrder: 3,
    });

    walkSnapshotForRemap(
      payload,
      new Map([['board-old', 'board-new']]),
      'mediaId',
    );
    const cfg = payload.models.HomeSection[0]!.configJson as {
      boardId: string;
    };
    expect(cfg.boardId).toBe('board-old'); // 무변경
  });

  it('mediaId가 idMap에 없으면 그대로 유지', () => {
    const payload = emptyPayload();
    payload.models.HomeSection.push({
      id: 'sec-5',
      sectionType: 'HERO',
      title: 'test-section',
      configJson: {
        slides: [{ imageUrl: '/u/x.jpg', imageAlt: 'x', title: 'X', mediaId: 'unknown' }],
        slideOptions: {},
      },
      isVisible: true,
      displayOrder: 4,
    });

    walkSnapshotForRemap(payload, new Map([['other', 'other-new']]), 'mediaId');

    const cfg = payload.models.HomeSection[0]!.configJson as {
      slides: Array<{ mediaId: string }>;
    };
    expect(cfg.slides[0]!.mediaId).toBe('unknown');
  });
});

describe('walkSnapshotForRemap — PageBlock', () => {
  it('IMAGE 블록의 imageMediaId 재매핑 (field name 다름!)', () => {
    const payload = emptyPayload();
    payload.models.PageBlock.push({
      id: 'blk-1',
      subpageId: 'sub-1',
      blockType: 'IMAGE',
      configJson: {
        imageUrl: '/u/x.jpg',
        imageAlt: 'x',
        imageMediaId: 'old-img',
      },
      isVisible: true,
      displayOrder: 0,
    });

    walkSnapshotForRemap(payload, new Map([['old-img', 'new-img']]), 'mediaId');

    const cfg = payload.models.PageBlock[0]!.configJson as {
      imageMediaId: string;
    };
    expect(cfg.imageMediaId).toBe('new-img');
  });

  it('RICH_TEXT 블록의 contentJson Tiptap image 노드 재귀 재매핑', () => {
    const payload = emptyPayload();
    payload.models.PageBlock.push({
      id: 'blk-2',
      subpageId: 'sub-1',
      blockType: 'RICH_TEXT',
      configJson: {
        contentJson: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'image',
                  attrs: { src: '/u/a.jpg', mediaId: 'tiptap-old' },
                },
              ],
            },
          ],
        },
      },
      isVisible: true,
      displayOrder: 1,
    });

    walkSnapshotForRemap(
      payload,
      new Map([['tiptap-old', 'tiptap-new']]),
      'mediaId',
    );

    const cfg = payload.models.PageBlock[0]!.configJson as {
      contentJson: {
        content: Array<{
          content: Array<{ type: string; attrs: { mediaId: string } }>;
        }>;
      };
    };
    expect(cfg.contentJson.content[0]!.content[0]!.attrs.mediaId).toBe(
      'tiptap-new',
    );
  });

  it('HTML / IFRAME 블록은 무관 (skip)', () => {
    const payload = emptyPayload();
    payload.models.PageBlock.push({
      id: 'blk-3',
      subpageId: 'sub-1',
      blockType: 'HTML',
      configJson: { html: '<p>hi</p>', css: null },
      isVisible: true,
      displayOrder: 2,
    });
    payload.models.PageBlock.push({
      id: 'blk-4',
      subpageId: 'sub-1',
      blockType: 'IFRAME',
      configJson: {
        src: 'https://www.youtube.com/embed/abc',
        title: 'video',
        aspectRatio: '16:9',
        allowFullscreen: true,
      },
      isVisible: true,
      displayOrder: 3,
    });

    walkSnapshotForRemap(payload, new Map([['x', 'y']]), 'mediaId');
    // 변경 없음 (HTML/IFRAME에는 mediaId 없음)
    expect(payload.models.PageBlock[0]!.configJson).toEqual({
      html: '<p>hi</p>',
      css: null,
    });
  });
});

describe('walkSnapshotForRemap — HomePopup', () => {
  it('CONTENT 타입 contentJson Tiptap 재매핑', () => {
    const payload = emptyPayload();
    payload.models.HomePopup.push({
      id: 'pop-1',
      popupType: 'CONTENT',
      title: '공지',
      contentJson: {
        type: 'doc',
        content: [
          {
            type: 'image',
            attrs: { mediaId: 'pop-old', src: '/u/p.jpg' },
          },
        ],
      },
      content: '공지',
      imageUrl: null,
      imageAlt: null,
      imageMediaId: null,
      linkUrl: null,
      buttonLabel: null,
      isVisible: true,
      displayOrder: 0,
      startDate: null,
      endDate: null,
    });

    walkSnapshotForRemap(payload, new Map([['pop-old', 'pop-new']]), 'mediaId');

    const cj = payload.models.HomePopup[0]!.contentJson as {
      content: Array<{ attrs: { mediaId: string } }>;
    };
    expect(cj.content[0]!.attrs.mediaId).toBe('pop-new');
  });

  it('IMAGE 타입 contentJson은 무관 (Tiptap 안 들어감)', () => {
    const payload = emptyPayload();
    const tiptapLike = {
      type: 'doc',
      content: [{ type: 'image', attrs: { mediaId: 'should-not-touch' } }],
    };
    payload.models.HomePopup.push({
      id: 'pop-2',
      popupType: 'IMAGE',
      title: 'test-section',
      contentJson: tiptapLike,
      content: null,
      imageUrl: '/u/p.jpg',
      imageAlt: 'alt',
      imageMediaId: 'img-id',
      linkUrl: null,
      buttonLabel: null,
      isVisible: true,
      displayOrder: 1,
      startDate: null,
      endDate: null,
    });

    walkSnapshotForRemap(
      payload,
      new Map([['should-not-touch', 'changed']]),
      'mediaId',
    );

    // popupType !== CONTENT라 contentJson 변경 X
    const cj = payload.models.HomePopup[0]!.contentJson as {
      content: Array<{ attrs: { mediaId: string } }>;
    };
    expect(cj.content[0]!.attrs.mediaId).toBe('should-not-touch');
  });
});

describe('walkSnapshotForRemap — SubpageVersion.snapshot', () => {
  it('meta.featuredImageId 재매핑', () => {
    const payload = emptyPayload();
    payload.models.SubpageVersion.push({
      id: 'ver-1',
      subpageId: 'sub-1',
      createdById: null,
      label: null,
      snapshot: {
        meta: { featuredImageId: 'old-feat' },
        blocks: [],
      },
      isPinned: false,
      sourceAction: 'MANUAL',
    });

    walkSnapshotForRemap(payload, new Map([['old-feat', 'new-feat']]), 'mediaId');

    const sn = payload.models.SubpageVersion[0]!.snapshot as {
      meta: { featuredImageId: string };
    };
    expect(sn.meta.featuredImageId).toBe('new-feat');
  });

  it('blocks[] IMAGE/RICH_TEXT 재귀 재매핑', () => {
    const payload = emptyPayload();
    payload.models.SubpageVersion.push({
      id: 'ver-2',
      subpageId: 'sub-1',
      createdById: null,
      label: null,
      snapshot: {
        meta: { featuredImageId: null },
        blocks: [
          {
            blockType: 'IMAGE',
            configJson: { imageMediaId: 'snap-img-old', imageUrl: '/u/x.jpg' },
          },
          {
            blockType: 'RICH_TEXT',
            configJson: {
              contentJson: {
                type: 'doc',
                content: [{ type: 'image', attrs: { mediaId: 'snap-rt-old' } }],
              },
            },
          },
        ],
      },
      isPinned: false,
      sourceAction: 'MANUAL',
    });

    walkSnapshotForRemap(
      payload,
      new Map([
        ['snap-img-old', 'snap-img-new'],
        ['snap-rt-old', 'snap-rt-new'],
      ]),
      'mediaId',
    );

    const sn = payload.models.SubpageVersion[0]!.snapshot as {
      blocks: Array<{ blockType: string; configJson: unknown }>;
    };
    expect(
      (sn.blocks[0]!.configJson as { imageMediaId: string }).imageMediaId,
    ).toBe('snap-img-new');
    expect(
      (
        sn.blocks[1]!.configJson as {
          contentJson: { content: Array<{ attrs: { mediaId: string } }> };
        }
      ).contentJson.content[0]!.attrs.mediaId,
    ).toBe('snap-rt-new');
  });
});

describe('walkSnapshotForRemap — Post', () => {
  it('contentJson Tiptap image 재매핑', () => {
    const payload = emptyPayload();
    payload.models.Post.push({
      id: 'post-1',
      title: 'p',
      slug: 'p',
      boardId: 'b1',
      seoTitle: null,
      seoDescription: null,
      contentJson: {
        type: 'doc',
        content: [{ type: 'image', attrs: { mediaId: 'post-old' } }],
      },
      content: null,
      status: 'PUBLISHED',
      publishedAt: null,
      featuredImageId: null,
      authorId: null,
      displayOrder: 0,
    });

    walkSnapshotForRemap(payload, new Map([['post-old', 'post-new']]), 'mediaId');

    const cj = payload.models.Post[0]!.contentJson as {
      content: Array<{ attrs: { mediaId: string } }>;
    };
    expect(cj.content[0]!.attrs.mediaId).toBe('post-new');
  });
});

describe('walkSnapshotForRemap — edge', () => {
  it('빈 idMap이면 즉시 return (변경 없음)', () => {
    const payload = emptyPayload();
    payload.models.HomeSection.push({
      id: 'sec-empty',
      sectionType: 'HERO',
      title: 'test-section',
      configJson: {
        slides: [{ imageUrl: 'x', imageAlt: 'x', title: 'X', mediaId: 'm1' }],
        slideOptions: {},
      },
      isVisible: true,
      displayOrder: 0,
    });
    walkSnapshotForRemap(payload, new Map(), 'mediaId');
    const cfg = payload.models.HomeSection[0]!.configJson as {
      slides: Array<{ mediaId: string }>;
    };
    expect(cfg.slides[0]!.mediaId).toBe('m1'); // 무변경
  });
});
