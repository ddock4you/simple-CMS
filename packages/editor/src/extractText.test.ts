import { describe, expect, it } from 'vitest';

import { extractTextFromTiptap } from './extractText';

describe('extractTextFromTiptap', () => {
  it('null → 빈 문자열', () => {
    expect(extractTextFromTiptap(null)).toBe('');
  });

  it('undefined → 빈 문자열', () => {
    expect(extractTextFromTiptap(undefined)).toBe('');
  });

  it('문자열 입력 → 빈 문자열', () => {
    expect(extractTextFromTiptap('plain text')).toBe('');
  });

  it('빈 doc → 빈 문자열', () => {
    expect(extractTextFromTiptap({ type: 'doc', content: [] })).toBe('');
  });

  it('단일 text 노드 추출', () => {
    const node = { type: 'text', text: 'hello' };
    expect(extractTextFromTiptap(node)).toBe('hello');
  });

  it('doc 노드는 자식을 줄바꿈으로 연결', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'first' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'second' }] },
      ],
    };
    expect(extractTextFromTiptap(doc)).toBe('first\nsecond');
  });

  it('비-doc 노드는 자식을 빈 문자열로 연결', () => {
    const para = {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'hello' },
        { type: 'text', text: ' world' },
      ],
    };
    expect(extractTextFromTiptap(para)).toBe('hello world');
  });

  it('중첩 구조 재귀 추출', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'line ' },
            {
              type: 'bold',
              content: [{ type: 'text', text: 'one' }],
            },
          ],
        },
      ],
    };
    expect(extractTextFromTiptap(doc)).toBe('line one');
  });

  it('content 없는 노드(이미지 등) → 텍스트 없음', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'image', attrs: { src: '/img.png' } },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'caption' }],
        },
      ],
    };
    expect(extractTextFromTiptap(doc)).toBe('caption');
  });

  it('여러 단락의 텍스트를 줄바꿈으로 구분', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'A' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'B' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'C' }] },
      ],
    };
    expect(extractTextFromTiptap(doc)).toBe('A\nB\nC');
  });

  it('heading 노드 텍스트 추출', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Title' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Body' }],
        },
      ],
    };
    expect(extractTextFromTiptap(doc)).toBe('Title\nBody');
  });
});
