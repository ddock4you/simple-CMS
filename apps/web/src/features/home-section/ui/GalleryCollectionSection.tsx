'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';

import type {
  ResolvedGalleryCollectionItem,
  ResolvedGalleryCollectionSection,
} from '@/entities/home-section/api/getHomeSections';

interface GalleryCollectionSectionProps {
  section: ResolvedGalleryCollectionSection;
}

export function GalleryCollectionSection({
  section,
}: GalleryCollectionSectionProps) {
  const { heading, description } = section.config;
  const [activeTabId, setActiveTabId] = useState(section.tabs[0]?.id ?? 'all');

  const activeTab = useMemo(
    () => section.tabs.find((tab) => tab.id === activeTabId) ?? section.tabs[0],
    [activeTabId, section.tabs],
  );

  if (!activeTab) return null;

  const moreHref = activeTab.boardSlug
    ? `/board/${activeTab.boardSlug}`
    : section.moreHref;

  return (
    <section
      className="flex flex-col gap-[24px]"
      aria-labelledby={`gallery-collection-${section.id}`}
    >
      <div>
        <h2
          id={`gallery-collection-${section.id}`}
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

      <div className="flex flex-col gap-[16px] large:flex-row large:items-center large:gap-[16px]">
        <div className="krds-tab-area min-w-0 flex-1 overflow-hidden">
          <div className="tab line overflow-x-auto">
            <ul
              className="min-w-max"
              role="tablist"
              aria-label={`${heading} 게시판 필터`}
            >
              {section.tabs.map((tab) => {
                const selected = tab.id === activeTab.id;
                const tabId = `gallery-tab-${section.id}-${tab.id}`;
                const panelId = `gallery-panel-${section.id}-${tab.id}`;

                return (
                  <li key={tab.id} className={selected ? 'active' : undefined}>
                    <button
                      id={tabId}
                      type="button"
                      className="btn-tab"
                      role="tab"
                      aria-selected={selected}
                      aria-controls={panelId}
                      tabIndex={selected ? 0 : -1}
                      onClick={() => setActiveTabId(tab.id)}
                    >
                      {tab.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {moreHref && (
          <Link
            href={moreHref}
            className="inline-flex h-[32px] shrink-0 items-center justify-end gap-[4px] px-[2px] text-[17px] leading-[1.5] text-[#1e2124] no-underline hover:underline"
          >
            더보기
            <Plus className="size-[20px]" aria-hidden="true" />
          </Link>
        )}
      </div>

      <div
        id={`gallery-panel-${section.id}-${activeTab.id}`}
        role="tabpanel"
        aria-labelledby={`gallery-tab-${section.id}-${activeTab.id}`}
      >
        {activeTab.items.length > 0 ? (
          <GalleryCollectionGrid items={activeTab.items} />
        ) : (
          <p className="rounded-[8px] border border-[#e4e4e4] bg-white px-[20px] py-[32px] text-center text-[15px] leading-[1.6] text-[#717171]">
            표시할 게시글이 없습니다.
          </p>
        )}
      </div>
    </section>
  );
}

function GalleryCollectionGrid({
  items,
}: {
  items: ResolvedGalleryCollectionItem[];
}) {
  return (
    <div className="grid grid-cols-2 gap-[16px] medium:grid-cols-3 large:gap-[24px]">
      {items.map((item) => (
        <GalleryCollectionCard key={item.id} item={item} />
      ))}
    </div>
  );
}

function GalleryCollectionCard({
  item,
}: {
  item: ResolvedGalleryCollectionItem;
}) {
  return (
    <Link
      href={item.href}
      className="group flex flex-col overflow-hidden rounded-[8px] border border-[#e4e4e4] text-inherit no-underline transition-shadow duration-150 hover:shadow-[0_2px_8px_rgba(0,0,0,0.1)]"
    >
      <div className="aspect-video overflow-hidden bg-[#f4f5f6]">
        {item.thumbnailUrl ? (
          // 외부 URL도 가능하므로 next/image 대신 일반 img
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.thumbnailUrl}
            alt={item.thumbnailAlt ?? `${item.title} 썸네일`}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[13px] leading-[1.5] text-[#8a949e]">
            이미지 없음
          </div>
        )}
      </div>
      <div className="p-[16px] large:p-[24px]">
        <h3 className="line-clamp-2 overflow-hidden text-[16px] leading-[1.4] font-semibold text-[#1e2124]">
          {item.title}
        </h3>
        {item.publishedAt && (
          <span className="mt-[8px] block text-[13px] leading-[1.5] text-[#8a949e]">
            {formatDate(item.publishedAt)}
          </span>
        )}
      </div>
    </Link>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}
