import { describe, it, expect } from 'vitest';

import { computeBlocksContent } from './blockContentRecalculation';

describe('computeBlocksContent', () => {
  it('빈 배열 → null', () => {
    expect(computeBlocksContent([])).toBeNull();
  });

  it('configJson이 null인 블록 → skip', () => {
    expect(computeBlocksContent([{ blockType: 'RICH_TEXT', configJson: null }])).toBeNull();
  });

  it('configJson에 contentJson 없음 → skip', () => {
    expect(computeBlocksContent([{ blockType: 'RICH_TEXT', configJson: {} }])).toBeNull();
  });

  it('contentJson이 빈 doc → null (텍스트 없음)', () => {
    const block = {
      blockType: 'RICH_TEXT' as const,
      configJson: {
        contentJson: { type: 'doc', content: [] },
      },
    };
    expect(computeBlocksContent([block])).toBeNull();
  });

  it('공백만 있는 텍스트 노드 → skip', () => {
    const block = {
      blockType: 'RICH_TEXT' as const,
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
      blockType: 'RICH_TEXT' as const,
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
      blockType: 'RICH_TEXT' as const,
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
      blockType: 'RICH_TEXT' as const,
      configJson: {
        contentJson: {
          type: 'doc',
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: '내용 있음' }] },
          ],
        },
      },
    };
    const withoutText = {
      blockType: 'RICH_TEXT' as const,
      configJson: { contentJson: { type: 'doc', content: [] } },
    };
    expect(computeBlocksContent([withoutText, withText, withoutText])).toBe('내용 있음');
  });

  it('configJson이 HTML 블록 형태(contentJson 없음) → skip', () => {
    const htmlBlock = { blockType: 'RICH_TEXT' as const, configJson: { html: '<p>Hello</p>', css: null } };
    expect(computeBlocksContent([htmlBlock])).toBeNull();
  });

  it('ACCORDION 블록의 제목/설명/항목을 검색 텍스트에 포함', () => {
    const accordionBlock = {
      blockType: 'ACCORDION' as const,
      configJson: {
        heading: '자주묻는 질문',
        description: '서비스 이용 전 확인하세요.',
        items: [
          { title: '회원가입은 어떻게 하나요?', body: '상단 회원가입 버튼을 이용하세요.' },
          { title: '비밀번호를 잊었습니다.', body: '비밀번호 재설정을 요청하세요.' },
        ],
      },
    };

    expect(computeBlocksContent([accordionBlock])).toBe(
      '자주묻는 질문\n서비스 이용 전 확인하세요.\n회원가입은 어떻게 하나요?\n상단 회원가입 버튼을 이용하세요.\n비밀번호를 잊었습니다.\n비밀번호 재설정을 요청하세요.',
    );
  });
});
