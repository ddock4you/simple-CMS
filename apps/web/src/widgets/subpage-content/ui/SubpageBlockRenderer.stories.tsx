import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentProps } from 'react';

import { SubpageBlockRenderer } from './SubpageBlockRenderer';

type SubpageBlockRendererProps = ComponentProps<typeof SubpageBlockRenderer>;

/**
 * Server Component지만 async가 아니라 Storybook에서 정상 렌더.
 * 블록 타입별(RICH_TEXT / HTML / IMAGE / IFRAME)로 variants 구성.
 *
 * 참고: Tiptap JSON은 최소 형태의 doc만 포함. 실제 사용 시 tiptap/html이
 * `generateHTML`을 통해 서버에서 HTML로 변환.
 */
const richTextBlock = {
  id: 'block-1',
  blockType: 'RICH_TEXT' as const,
  displayOrder: 1,
  isVisible: true,
  configJson: {
    contentJson: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: '정책 개요' }],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: '본 서브페이지는 Tiptap RichText 블록 샘플입니다. admin에서 편집한 JSON이 공개 웹에서 HTML로 렌더링됩니다.',
            },
          ],
        },
      ],
    },
  },
};

const htmlBlock = {
  id: 'block-2',
  blockType: 'HTML' as const,
  displayOrder: 2,
  isVisible: true,
  configJson: {
    html: '<section class="demo"><h3>커스텀 HTML 블록</h3><p>DOMPurify sanitize 이후 렌더됩니다.</p></section>',
    css: '.demo { padding: 16px; border: 1px dashed #246BEB; border-radius: 8px; }',
  },
};

const imageBlock = {
  id: 'block-3',
  blockType: 'IMAGE' as const,
  displayOrder: 3,
  isVisible: true,
  configJson: {
    imageUrl: 'https://picsum.photos/800/400',
    imageAlt: '샘플 이미지',
    caption: '이미지 블록 샘플 (외부 URL)',
    linkUrl: null,
  },
};

const imageCarouselBlock = {
  id: 'block-5',
  blockType: 'IMAGE' as const,
  displayOrder: 5,
  isVisible: true,
  configJson: {
    items: [
      {
        imageUrl: 'https://picsum.photos/id/1015/960/540',
        imageAlt: '산과 강이 보이는 풍경',
        caption: '첫 번째 이미지',
        linkUrl: null,
      },
      {
        imageUrl: 'https://picsum.photos/id/1025/960/540',
        imageAlt: '강아지 초상',
        caption: '두 번째 이미지',
        linkUrl: 'https://www.krds.go.kr/',
      },
      {
        imageUrl: 'https://picsum.photos/id/1035/960/540',
        imageAlt: '나무와 들판 풍경',
        caption: '세 번째 이미지',
        linkUrl: null,
      },
      {
        imageUrl: 'https://picsum.photos/id/1043/960/540',
        imageAlt: '해변 풍경',
        caption: '네 번째 이미지',
        linkUrl: null,
      },
    ],
  },
};

const iframeBlock = {
  id: 'block-4',
  blockType: 'IFRAME' as const,
  displayOrder: 4,
  isVisible: true,
  configJson: {
    src: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    title: 'IFRAME 샘플 (YouTube no-cookie)',
    aspectRatio: '16:9' as const,
    allowFullscreen: true,
  },
};

const meta: Meta<SubpageBlockRendererProps> = {
  title: 'Web/Widgets/SubpageBlockRenderer',
  component: SubpageBlockRenderer,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    // RICH_TEXT/HTML 블록은 단독일 때 Canvas 좌상단에 작게 붙어 시각적으로 묻히기 쉬움 →
    // 공개 웹 실사용처(<article id="subpage-{id}"> 아래 `.subpage-blocks` wrapper)와 동등한
    // 최소 폭·여백을 주어 단독 렌더 variant에서도 실제 시각 결과를 비교하기 쉽게 한다.
    (Story, ctx) => (
      <article
        id={`subpage-${ctx.args.subpageId}`}
        style={{
          maxWidth: 820,
          minHeight: 160,
          margin: '0 auto',
          padding: 24,
          border: '1px dashed #cbd5e1',
          borderRadius: 8,
          background: '#ffffff',
        }}
      >
        <Story />
      </article>
    ),
  ],
  args: {
    subpageId: 'story-subpage-1',
  },
};

export default meta;

type Story = StoryObj<SubpageBlockRendererProps>;

export const Mixed: Story = {
  args: {
    blocks: [richTextBlock, htmlBlock, imageBlock, iframeBlock],
  },
};

export const RichTextOnly: Story = {
  args: {
    blocks: [richTextBlock],
  },
};

export const HtmlOnly: Story = {
  args: {
    blocks: [htmlBlock],
  },
};

export const ImageOnly: Story = {
  args: {
    blocks: [imageBlock],
  },
};

export const ImageCarousel: Story = {
  args: {
    blocks: [imageCarouselBlock],
  },
};

export const Empty: Story = {
  args: {
    blocks: [],
  },
};
