import Link from 'next/link';
import type { ReactNode } from 'react';

import type { SubCarouselItem } from '@simple-cms/types';

import { Carousel } from '@/shared/ui/Carousel';
import type { ResolvedSubCarouselSection } from '@/entities/home-section/api/getHomeSections';

interface SubCarouselSectionProps {
  section: ResolvedSubCarouselSection;
}

/**
 * 디바이스별 동시 표시 개수. SUB_CAROUSEL은 항상 Carousel (그리드 전환 없음).
 * globals.css의 .home-sub-carousel .swiper-slide calc()와 1:1 동기화 필수.
 */
const MOBILE_COUNT = 1;
const MEDIUM_COUNT = 2;
const LARGE_COUNT = 4;

export function SubCarouselSection({ section }: SubCarouselSectionProps) {
  const { tagline, mainHeading, subHeading, description, items, slideOptions } =
    section.config;

  if (items.length === 0) {
    return null;
  }

  return (
    <section
      className="home-sub-carousel"
      aria-labelledby={`sub-carousel-${section.id}`}
    >
      <div className="mb-[24px] text-center">
        {tagline && <p className="mb-[8px] text-[14px] leading-[1.5] font-medium tracking-[0.04em] text-[#8a949e]">{tagline}</p>}
        <h2
          id={`sub-carousel-${section.id}`}
          className="mb-[16px] whitespace-pre-line text-[22px] leading-[1.4] font-bold text-[#1e2124] medium:text-[28px]"
        >
          {mainHeading}
        </h2>
        {subHeading && (
          <p className="mb-[8px]">
            <span className="px-[0.1em] [background:linear-gradient(transparent_50%,#ffe0a3_50%)]">{subHeading}</span>
          </p>
        )}
        {description && (
          <p className="mt-[4px] text-[15px] leading-[1.6] text-[#555555]">{description}</p>
        )}
      </div>

      <Carousel
        slides={items.map((item, index) => (
          <div key={index} className="flex flex-1 flex-col items-center">{renderItem(item)}</div>
        ))}
        options={slideOptions}
        breakpoints={{
          0: { slidesPerView: MOBILE_COUNT, spaceBetween: 16 },
          768: { slidesPerView: MEDIUM_COUNT, spaceBetween: 16 },
          1024: { slidesPerView: LARGE_COUNT, spaceBetween: 24 },
          1280: { slidesPerView: LARGE_COUNT, spaceBetween: 24 },
        }}
        ariaLabel="서브 캐러셀 슬라이드"
      />
    </section>
  );
}

function renderItem(item: SubCarouselItem): ReactNode {
  const inner = (
    <>
      <div className="size-[120px] shrink-0 overflow-hidden rounded-full medium:size-[160px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.imageUrl}
          alt={item.imageAlt}
          loading="lazy"
          decoding="async"
          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-col gap-[4px]">
        <h3 className="text-[16px] leading-[1.5] font-bold text-[#1e2124]">{item.title}</h3>
        {item.subtitle && (
          <p className="text-[14px] leading-[1.5] text-[#8a949e] italic">{item.subtitle}</p>
        )}
      </div>
    </>
  );

  if (item.url) {
    return (
      <Link href={item.url} className="group flex flex-col items-center gap-[8px] text-center text-inherit no-underline">
        {inner}
      </Link>
    );
  }
  return <div className="flex flex-col items-center gap-[8px] text-center text-inherit">{inner}</div>;
}
