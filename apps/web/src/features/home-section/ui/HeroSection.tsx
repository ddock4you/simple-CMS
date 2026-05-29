import Link from 'next/link';
import type { ReactNode } from 'react';

import type { HeroSlide } from '@simple-cms/types';

import { Carousel } from '@/shared/ui/Carousel';
import type { ResolvedHeroSection } from '@/entities/home-section/api/getHomeSections';

interface HeroSectionProps {
  section: ResolvedHeroSection;
}

export function HeroSection({ section }: HeroSectionProps) {
  const { slides, slideOptions } = section.config;

  if (slides.length === 0) {
    return null;
  }

  // 단일 슬라이드 → 슬라이더 생략, 정적 렌더
  if (slides.length === 1) {
    return (
      <section
        className="block w-full overflow-hidden rounded-[12px]"
        aria-label="메인 히어로"
      >
        {renderSlide(slides[0])}
      </section>
    );
  }

  // 다중 슬라이드 → Carousel (한 번에 1개)
  return (
    <section
      data-hero-carousel
      className="block w-full min-w-0 overflow-hidden rounded-[12px]"
      aria-label="메인 히어로"
    >
      <Carousel
        slides={slides.map((slide, index) => (
          <div key={index} className="w-full">
            {renderSlide(slide)}
          </div>
        ))}
        options={slideOptions}
        ariaLabel="메인 히어로 슬라이드"
      />
    </section>
  );
}

function renderSlide(slide: HeroSlide): ReactNode {
  const content = (
    <div
      className="relative flex w-full min-h-[280px] items-end overflow-hidden rounded-[12px] bg-[#1a2b4a] bg-cover bg-center bg-no-repeat text-white medium:min-h-[360px] large:min-h-[440px]"
      style={
        slide.imageUrl
          ? { backgroundImage: `url(${escapeUrl(slide.imageUrl)})` }
          : undefined
      }
    >
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/25 to-black/10"
        aria-hidden="true"
      />
      <div className="relative z-10 max-w-[720px] px-[32px] pt-[32px] pb-[40px] medium:px-[40px] medium:pt-[40px]">
        <h2 className="mb-[16px] text-[28px] leading-[1.2] font-extrabold tracking-[-0.02em] [text-shadow:0_2px_12px_rgba(0,0,0,0.35)] medium:text-[36px] large:text-[44px] group-hover:underline group-hover:underline-offset-4">
          {slide.title}
        </h2>
        {slide.description && (
          <p className="text-[15px] leading-[1.6] opacity-95 [text-shadow:0_1px_8px_rgba(0,0,0,0.3)] medium:text-[17px]">
            {slide.description}
          </p>
        )}
      </div>
      {/* SR 전용 alt: 배경 이미지는 presentation이므로 별도 알림 */}
      <span className="sr-only">{slide.imageAlt}</span>
    </div>
  );

  if (slide.url) {
    return (
      <Link
        href={slide.url}
        className="group block text-inherit no-underline"
      >
        {content}
      </Link>
    );
  }
  return content;
}

/**
 * url() 안에서 깨지는 문자를 최소한 방어 (완전 sanitize 아님).
 * admin에서 Zod로 검증된 URL이므로 악성 입력은 드묾.
 */
function escapeUrl(url: string): string {
  return url.replace(/["'()\\]/g, (ch) => `\\${ch}`);
}
