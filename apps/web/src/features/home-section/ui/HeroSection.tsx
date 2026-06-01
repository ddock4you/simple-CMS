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
        className="relative left-1/2 block w-screen -translate-x-1/2 overflow-hidden"
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
      className="relative left-1/2 block w-screen min-w-0 -translate-x-1/2 overflow-hidden"
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
  return (
    <div className="relative flex min-h-[520px] w-full overflow-hidden bg-[#1e2124] text-white large:min-h-[560px]">
      {slide.imageUrl && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={slide.imageUrl}
          alt={slide.imageAlt}
          loading="eager"
          decoding="async"
          className="absolute inset-0 size-full object-cover"
        />
      )}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/75 via-black/55 to-black/25 large:from-black/70 large:via-black/45 large:to-black/15"
        aria-hidden="true"
      />
      <div className="relative z-10 mx-auto flex w-full max-w-[1200px] items-center px-[16px] py-[64px] medium:px-[24px] large:py-[96px]">
        <div className="max-w-[588px]">
          <h2 className="whitespace-pre-line text-[32px] leading-[1.5] font-bold tracking-[0.0313em] [text-shadow:0_2px_16px_rgba(0,0,0,0.35)] large:text-[36px] large:tracking-[0.0278em]">
            {slide.title}
          </h2>
          {slide.description && (
            <p className="mt-[20px] text-[17px] leading-[1.8] text-white/95 [text-shadow:0_1px_10px_rgba(0,0,0,0.32)] medium:text-[19px]">
              {slide.description}
            </p>
          )}
          {slide.url && (
            <Link
              href={slide.url}
              className="mt-[40px] inline-flex h-[64px] items-center justify-center rounded-[8px] bg-[#247B5C] px-[24px] text-[19px] leading-[1.5] font-normal text-white no-underline transition-colors hover:bg-[#1f6b50] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              자세히 보러가기
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
