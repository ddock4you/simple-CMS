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
      <section className="home-hero" aria-label="메인 히어로">
        {renderSlide(slides[0])}
      </section>
    );
  }

  // 다중 슬라이드 → Carousel (한 번에 1개)
  return (
    <section className="home-hero home-hero-carousel" aria-label="메인 히어로">
      <Carousel
        slides={slides.map((slide, index) => (
          <div key={index}>{renderSlide(slide)}</div>
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
      className="home-hero-slide"
      style={
        slide.imageUrl
          ? { backgroundImage: `url(${escapeUrl(slide.imageUrl)})` }
          : undefined
      }
    >
      <div className="home-hero-overlay" aria-hidden="true" />
      <div className="home-hero-inner">
        <h2 className="home-hero-title">{slide.title}</h2>
        {slide.description && (
          <p className="home-hero-description">{slide.description}</p>
        )}
      </div>
      {/* SR 전용 alt: 배경 이미지는 presentation이므로 별도 알림 */}
      <span className="sr-only">{slide.imageAlt}</span>
    </div>
  );

  if (slide.url) {
    return (
      <Link href={slide.url} className="home-hero-link">
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
