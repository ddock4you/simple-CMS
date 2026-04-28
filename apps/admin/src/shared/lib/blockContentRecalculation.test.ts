import { describe, it, expect } from 'vitest';

import { computeBlocksContent } from './blockContentRecalculation';

describe('computeBlocksContent', () => {
  it('빈 배열 → null', () => {
    expect(computeBlocksContent([])).toBeNull();
  });

  it('configJson이 null인 블록 → skip', () => {
    expect(computeBlocksContent([{ configJson: null }])).toBeNull();
  });

  it('configJson에 contentJson 없음 → skip', () => {
    expect(computeBlocksContent([{ configJson: {} }])).toBeNull();
  });

  it('contentJson이 빈 doc → null (텍스트 없음)', () => {
    const block = {
      configJson: {
        contentJson: { type: 'doc', content: [] },
      },
    };
    expect(computeBlocksContent([block])).toBeNull();
  });

  it('공백만 있는 텍스트 노드 → skip', () => {
    const block = {
      configJson: {
        contentJson: {
          type: 'doc',
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: '   ' }] },
          ],
        },
      },
    };
    expect(computeBlocksContent([block])).toBeNull();
  });

  it('단일 블록 → 텍스트 반환', () => {
    const block = {
      configJson: {
        contentJson: {
          type: 'doc',
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: '안녕하세요' }] },
          ],
        },
      },
    };
    expect(computeBlocksContent([block])).toBe('안녕하세요');
  });

  it('여러 블록 → 개행 2개로 이어붙임', () => {
    const makeBlock = (text: string) => ({
      configJson: {
        contentJson: {
          type: 'doc',
          content: [
            { type: 'paragraph', content: [{ type: 'text', text }] },
          ],
        },
      },
    });
    const blocks = [makeBlock('첫 번째'), makeBlock('두 번째'), makeBlock('세 번째')];
    expect(computeBlocksContent(blocks)).toBe('첫 번째\n\n두 번째\n\n세 번째');
  });

  it('일부 블록에 텍스트 없으면 해당 블록만 skip', () => {
    const withText = {
      configJson: {
        contentJson: {
          type: 'doc',
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: '내용 있음' }] },
          ],
        },
      },
    };
    const withoutText = { configJson: { contentJson: { type: 'doc', content: [] } } };
    expect(computeBlocksContent([withoutText, withText, withoutText])).toBe('내용 있음');
  });

  it('configJson이 HTML 블록 형태(contentJson 없음) → skip', () => {
    const htmlBlock = { configJson: { html: '<p>Hello</p>', css: null } };
    expect(computeBlocksContent([htmlBlock])).toBeNull();
  });
});
