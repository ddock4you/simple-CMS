import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from 'storybook/test';

import { CtaSection } from './CtaSection';

const meta = {
  title: 'Web/Features/HomeSection/CtaSection',
  component: CtaSection,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof CtaSection>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Stage 12i — CTA 섹션 기본 렌더.
 * 제목 + 설명 + 버튼이 올바르게 렌더되고 링크 href 확인.
 */
export const Default: Story = {
  args: {
    section: {
      id: 'cta-1',
      sectionType: 'CTA',
      config: {
        heading: '지금 바로 시작하세요',
        description: '공공기관 정보를 한눈에 확인하세요.',
        buttonLabel: '바로가기',
        buttonUrl: '/p/about',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText('지금 바로 시작하세요')).toBeInTheDocument();
    expect(canvas.getByText('공공기관 정보를 한눈에 확인하세요.')).toBeInTheDocument();
    const btn = canvas.getByRole('link', { name: '바로가기' });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute('href', '/p/about');
  },
};

/**
 * Stage 12i — 설명 없는 CTA 섹션 렌더.
 * description 미설정 시 빈 <p> 없이 렌더됨을 확인.
 */
export const WithoutDescription: Story = {
  args: {
    section: {
      id: 'cta-2',
      sectionType: 'CTA',
      config: {
        heading: '공지사항',
        description: undefined,
        buttonLabel: '더 보기',
        buttonUrl: '/board/notice',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText('공지사항')).toBeInTheDocument();
    expect(canvas.queryByRole('paragraph')).toBeNull();
  },
};
