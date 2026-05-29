import Link from 'next/link';
import type { ReactNode } from 'react';

import type { RecommendedItem } from '@simple-cms/types';

import { Carousel } from '@/shared/ui/Carousel';
import type { ResolvedRecommendedSection } from '@/entities/home-section/api/getHomeSections';

interface RecommendedSectionProps {
  section: ResolvedRecommendedSection;
}

/**
 * 디바이스별 동시 표시 개수. 이 개수를 초과하면 Carousel, 이하면 그리드.
 */
const MOBILE_COUNT = 1;
const MEDIUM_COUNT = 2;
const LARGE_COUNT = 3;

export function RecommendedSection({ section }: RecommendedSectionProps) {
  const { heading, description, items, slideOptions } = section.config;

  if (items.length === 0) {
    return null;
  }

  const useCarousel = items.length > LARGE_COUNT;

  return (
    <section
      className="home-recommended"
      aria-labelledby={`recommended-${section.id}`}
    >
      <div className="home-section-header">
        <h2 id={`recommended-${section.id}`} className="home-section-title">
          {heading}
        </h2>
        {description && (
          <p className="home-section-description">{description}</p>
        )}
      </div>

      {useCarousel ? (
        <Carousel
          slides={items.map((item, index) => (
            <div key={index}>{renderItem(item)}</div>
          ))}
          options={slideOptions}
          breakpoints={{
            0: { slidesPerView: MOBILE_COUNT, spaceBetween: 16 },
            768: { slidesPerView: MEDIUM_COUNT, spaceBetween: 16 },
            1024: { slidesPerView: LARGE_COUNT, spaceBetween: 24 },
            1280: { slidesPerView: LARGE_COUNT, spaceBetween: 24 },
          }}
          ariaLabel="추천 콘텐츠 슬라이드"
        />
      ) : (
        <ul className="home-recommended-grid">
          {items.map((item, index) => (
            <li key={index} className="home-recommended-card">
              {renderItem(item)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function renderItem(item: RecommendedItem): ReactNode {
  const inner = (
    <>
      <div className="home-recommended-thumb">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.imageUrl}
          alt={item.imageAlt}
          loading="lazy"
          decoding="async"
        />
      </div>
      <div className="home-recommended-body">
        <h3 className="home-recommended-title">{item.title}</h3>
        {item.description && (
          <p className="home-recommended-desc">{item.description}</p>
        )}
      </div>
    </>
  );

  if (item.url) {
    return (
      <Link href={item.url} className="home-recommended-link">
        {inner}
      </Link>
    );
  }
  return <div className="home-recommended-link">{inner}</div>;
}
