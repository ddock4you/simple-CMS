import type { Meta, StoryObj } from '@storybook/react';
import { expect } from 'storybook/test';

import { Carousel } from './Carousel';

/**
 * Web/Shared/Carousel — Swiper 12 기반 공통 캐러셀 + 22M 회귀 자동 감지 (Stage 7i).
 *
 * 22M 회귀: 첫 방문 시 Pretendard CDN + KRDS Header mount의 async layout shift로
 * swiper 측정이 race condition에 빠지면 `slide.style.width`가 22369600px 같은
 * 비정상 값으로 박힘. Stage 7e에서 다층 defensive triggers (rAF 2회 + window 'load'
 * + ResizeObserver) 도입. Storybook 환경은 timing이 안정적이라 단순 mount만으론
 * 회귀 재현 안 되므로 `Regression22M` play function이 container CSS width를
 * 강제 변경해 ResizeObserver 경로를 직접 트리거 + slide width assert.
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

/**
 * 22M 회귀 자동 감지 — container width 변경으로 ResizeObserver 경로를 강제
 * 트리거하고 slide width가 정상 범위(0 < w < 2000)인지 assert.
 * Carousel.tsx의 ResizeObserver.observe(el) 또는 swiper.update() 호출이 제거되면
 * 이 테스트가 실패한다.
 */
export const Regression22M: Story = {
  args: {
    slides: sampleSlides,
    options: {
      showPrevNext: false,
      showDots: false,
      showPlayPause: false,
      autoPlay: false,
      autoPlayInterval: 5000,
    },
    slidesPerView: 1,
    ariaLabel: '22M 회귀 검증 캐러셀',
  },
  play: async ({ canvasElement }) => {
    const container = canvasElement.querySelector(
      '.krds-carousel',
    ) as HTMLElement | null;
    expect(container).not.toBeNull();
    if (!container) return;

    // ResizeObserver 강제 트리거 (Stage 7e 다층 방어 중 ResizeObserver 경로 검증)
    container.style.width = '400px';
    await new Promise((r) => setTimeout(r, 80));
    container.style.width = '800px';
    await new Promise((r) => setTimeout(r, 80));

    const slides = canvasElement.querySelectorAll('.swiper-slide');
    expect(slides.length).toBeGreaterThan(0);
    slides.forEach((slide) => {
      const widthStr = (slide as HTMLElement).style.width;
      const w = parseFloat(widthStr);
      // 22369600px 같은 비정상 값 + 화면 width 초과 모두 차단
      expect(w).toBeLessThan(2000);
      // 정상 측정 확인 (NaN, 0, 음수 모두 reject)
      expect(w).toBeGreaterThan(0);
    });
  },
};
