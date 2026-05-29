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
      <div className="mb-[24px]">
        <h2 id={`recommended-${section.id}`} className="text-[28px] leading-[1.3] font-bold text-[#1e2124]">
          {heading}
        </h2>
        {description && (
          <p className="mt-[8px] text-[16px] leading-[1.6] text-[#555555]">{description}</p>
        )}
      </div>

      {useCarousel ? (
        <Carousel
          slides={items.map((item, index) => (
            <div key={index} className="flex flex-1 overflow-hidden rounded-[8px] border border-[#e4e4e4] bg-white transition-[box-shadow,transform] duration-150 hover:-translate-y-[2px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]">{renderItem(item)}</div>
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
        <ul className="grid list-none grid-cols-1 gap-[16px] p-0 medium:grid-cols-2 large:grid-cols-3 large:gap-[24px]">
          {items.map((item, index) => (
            <li key={index} className="h-full overflow-hidden rounded-[8px] border border-[#e4e4e4] bg-white transition-[box-shadow,transform] duration-150 hover:-translate-y-[2px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
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
      <div className="aspect-video overflow-hidden bg-[#f4f5f6]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.imageUrl}
          alt={item.imageAlt}
          loading="lazy"
          decoding="async"
          className="block size-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
        />
      </div>
      <div className="flex flex-1 flex-col gap-[8px] p-[16px] large:p-[24px]">
        <h3 className="line-clamp-2 overflow-hidden text-[17px] leading-[1.4] font-semibold text-[#1e2124]">{item.title}</h3>
        {item.description && (
          <p className="line-clamp-2 overflow-hidden text-[14px] leading-[1.55] text-[#555555]">{item.description}</p>
        )}
      </div>
    </>
  );

  if (item.url) {
    return (
      <Link href={item.url} className="group flex h-full flex-col text-inherit no-underline">
        {inner}
      </Link>
    );
  }
  return <div className="flex h-full flex-col text-inherit">{inner}</div>;
}
