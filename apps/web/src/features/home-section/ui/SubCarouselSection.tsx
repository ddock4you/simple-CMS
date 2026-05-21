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
const TABLET_COUNT = 2;
const DESKTOP_COUNT = 4;

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
      <div className="home-sub-carousel-header">
        {tagline && <p className="home-sub-carousel-tagline">{tagline}</p>}
        <h2
          id={`sub-carousel-${section.id}`}
          className="home-sub-carousel-main-heading"
        >
          {mainHeading}
        </h2>
        {subHeading && (
          <p className="home-sub-carousel-sub-heading">
            <span className="home-sub-carousel-highlight">{subHeading}</span>
          </p>
        )}
        {description && (
          <p className="home-sub-carousel-description">{description}</p>
        )}
      </div>

      <Carousel
        slides={items.map((item, index) => (
          <div key={index}>{renderItem(item)}</div>
        ))}
        options={slideOptions}
        breakpoints={{
          0: { slidesPerView: MOBILE_COUNT, spaceBetween: 16 },
          768: { slidesPerView: TABLET_COUNT, spaceBetween: 20 },
          1024: { slidesPerView: DESKTOP_COUNT, spaceBetween: 24 },
        }}
        ariaLabel="서브 캐러셀 슬라이드"
      />
    </section>
  );
}

function renderItem(item: SubCarouselItem): ReactNode {
  const inner = (
    <>
      <div className="home-sub-carousel-thumb">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.imageUrl}
          alt={item.imageAlt}
          loading="lazy"
          decoding="async"
        />
      </div>
      <div className="home-sub-carousel-body">
        <h3 className="home-sub-carousel-item-title">{item.title}</h3>
        {item.subtitle && (
          <p className="home-sub-carousel-item-subtitle">{item.subtitle}</p>
        )}
      </div>
    </>
  );

  if (item.url) {
    return (
      <Link href={item.url} className="home-sub-carousel-card">
        {inner}
      </Link>
    );
  }
  return <div className="home-sub-carousel-card">{inner}</div>;
}
