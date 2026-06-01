import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from 'storybook/test';

import { HeroSection } from './HeroSection';

const DEFAULT_SLIDE_OPTIONS = {
  showPrevNext: true,
  showPlayPause: false,
  showDots: true,
  autoPlay: false,
  autoPlayInterval: 5000,
};

const meta = {
  title: 'Web/Features/HomeSection/HeroSection',
  component: HeroSection,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof HeroSection>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Stage 12i — 단일 슬라이드 히어로 렌더 (정적 배너).
 * slides.length === 1이면 Carousel 생략 — section aria-label만 있음.
 */
export const SingleSlide: Story = {
  args: {
    section: {
      id: 'hero-1',
      sectionType: 'HERO',
      config: {
        slides: [
          {
            imageUrl: 'https://via.placeholder.com/1200x440',
            imageAlt: '히어로 배경 이미지',
            title: '공공기관 통합 정보 포털',
            description: '필요한 모든 정보를 한 곳에서 확인하세요.',
            url: '/p/about',
          },
        ],
        slideOptions: DEFAULT_SLIDE_OPTIONS,
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText('공공기관 통합 정보 포털')).toBeInTheDocument();
    expect(
      canvas.getByText('필요한 모든 정보를 한 곳에서 확인하세요.'),
    ).toBeInTheDocument();
    expect(
      canvas.getByRole('link', { name: '자세히 보러가기' }),
    ).toHaveAttribute('href', '/p/about');
    // 단일 슬라이드: 캐러셀 없이 단순 section으로 렌더
    expect(canvasElement.querySelector('[data-hero-carousel]')).toBeNull();
  },
};

/**
 * 다중 슬라이드 히어로 렌더. Carousel을 유지하되 slide 전체가 아닌 CTA만 링크로 동작한다.
 */
export const MultipleSlides: Story = {
  args: {
    section: {
      id: 'hero-3',
      sectionType: 'HERO',
      config: {
        slides: [
          {
            imageUrl: 'https://via.placeholder.com/1600x560/244062/ffffff',
            imageAlt: '도시 전경 이미지',
            title:
              '나와 내 가족의 보조금 혜택 정보를\n지금, 한 번에 확인해 보세요.',
            description: '공공서비스 정보를 쉽고 빠르게 찾아볼 수 있습니다.',
            url: '/search',
          },
          {
            imageUrl: 'https://via.placeholder.com/1600x560/247B5C/ffffff',
            imageAlt: '공공서비스 안내 이미지',
            title: '필요한 서비스를\n더 편리하게 안내합니다.',
            description: '새로운 소식과 추천 콘텐츠를 메인에서 확인하세요.',
            url: null,
          },
        ],
        slideOptions: DEFAULT_SLIDE_OPTIONS,
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(
      canvasElement.querySelector('[data-hero-carousel]'),
    ).toBeInTheDocument();
    expect(
      canvas.getAllByText(/나와 내 가족의 보조금 혜택 정보를/).length,
    ).toBeGreaterThan(0);
    expect(
      canvas.getAllByRole('link', { name: '자세히 보러가기' }).length,
    ).toBeGreaterThan(0);
  },
};

/**
 * Stage 12i — 빈 slides 시 null 렌더 (섹션 자체 미표시).
 */
export const EmptySlides: Story = {
  args: {
    section: {
      id: 'hero-2',
      sectionType: 'HERO',
      config: {
        slides: [],
        slideOptions: DEFAULT_SLIDE_OPTIONS,
      },
    },
  },
  play: async ({ canvasElement }) => {
    // slides 비어있으면 return null → canvasElement에 아무것도 없음
    expect(canvasElement.querySelector('section')).toBeNull();
  },
};
