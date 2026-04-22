import type { Meta, StoryObj } from '@storybook/react';

import { Carousel } from './Carousel';

/**
 * swiper width 22M 회귀 방지 테스트는 Stage 7g에서 추가.
 * 이번 Stage는 smoke render만 확인 (3개 슬라이드, dots + prev/next 표시).
 */
const meta = {
  title: 'Web/Shared/Carousel',
  component: Carousel,
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof Carousel>;

export default meta;

type Story = StoryObj<typeof meta>;

const sampleSlides = [
  <div
    key="1"
    style={{
      height: 240,
      background: '#246BEB',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 28,
      fontWeight: 700,
    }}
  >
    슬라이드 1
  </div>,
  <div
    key="2"
    style={{
      height: 240,
      background: '#E71825',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 28,
      fontWeight: 700,
    }}
  >
    슬라이드 2
  </div>,
  <div
    key="3"
    style={{
      height: 240,
      background: '#212121',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 28,
      fontWeight: 700,
    }}
  >
    슬라이드 3
  </div>,
];

export const Default: Story = {
  args: {
    slides: sampleSlides,
    options: {
      showPrevNext: true,
      showDots: true,
      showPlayPause: false,
      autoPlay: false,
      autoPlayInterval: 5000,
    },
    ariaLabel: '샘플 캐러셀',
  },
};

export const WithAutoplay: Story = {
  args: {
    slides: sampleSlides,
    options: {
      showPrevNext: true,
      showDots: true,
      showPlayPause: true,
      autoPlay: true,
      autoPlayInterval: 3000,
    },
    ariaLabel: '자동재생 캐러셀',
  },
};
