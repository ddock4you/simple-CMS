import Link from 'next/link';
import { Plus } from 'lucide-react';

import type { LegacyNoticeItem } from '@simple-cms/types';

import type { ResolvedNoticeSection } from '@/entities/home-section/api/getHomeSections';
import {
  BoardSpotlightFeaturedCard,
  BoardSpotlightPostCard,
  type BoardSpotlightItem,
} from './BoardSpotlightCard';

interface NoticeSectionProps {
  section: ResolvedNoticeSection;
}

export function NoticeSection({ section }: NoticeSectionProps) {
  const { heading, description } = section.config;
  const legacyItems = section.config.items ?? [];
  const hasBoardItems =
    Boolean(section.featuredItem) || section.items.length > 0;
  const hasLegacyItems = !hasBoardItems && legacyItems.length > 0;

  if (!hasBoardItems && !hasLegacyItems) {
    return null;
  }

  return (
    <section className="home-notice" aria-labelledby={`notice-${section.id}`}>
      <div className="mb-[20px] flex items-center gap-[16px] large:mb-[24px]">
        <div className="min-w-0 flex-1">
          <h2
            id={`notice-${section.id}`}
            className="m-0 text-[28px] leading-[1.5] font-bold tracking-[0.0357em] text-[#1e2124] large:text-[32px] large:tracking-[0.0313em]"
          >
            {heading}
          </h2>
          {description && (
            <p className="mt-[8px] text-[17px] leading-[1.8] text-[#464c53]">
              {description}
            </p>
          )}
        </div>
        {section.boardSlug && (
          <Link
            href={`/board/${section.boardSlug}`}
            className="inline-flex h-[32px] shrink-0 items-center gap-[4px] px-[2px] text-[17px] leading-[1.5] text-[#1e2124] no-underline hover:underline"
          >
            더보기
            <Plus className="size-[20px]" aria-hidden="true" />
          </Link>
        )}
      </div>

      {hasBoardItems ? (
        <div className="flex flex-col gap-[16px] large:gap-[24px]">
          {section.featuredItem && (
            <BoardSpotlightFeaturedCard item={section.featuredItem} />
          )}
          {section.items.length > 0 && (
            <div className="grid grid-cols-1 gap-[16px] large:grid-cols-4 large:gap-[24px]">
              {section.items.map((item) => (
                <BoardSpotlightPostCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <LegacyNoticeGrid items={legacyItems} />
      )}
    </section>
  );
}

function LegacyNoticeGrid({ items }: { items: LegacyNoticeItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-[16px] large:grid-cols-4 large:gap-[24px]">
      {items.map((item, index) => (
        <BoardSpotlightPostCard
          key={`${item.label}-${index}`}
          item={toLegacyCardItem(item)}
        />
      ))}
    </div>
  );
}

function toLegacyCardItem(item: LegacyNoticeItem): BoardSpotlightItem {
  return {
    title: item.label,
    href: item.url ?? null,
    publishedAt: item.date ?? null,
    description: item.date ? `게시일 ${item.date}` : null,
  };
}
