import Link from 'next/link';

import type { ResolvedNoticeSection } from '@/entities/home-section/api/getHomeSections';

interface NoticeSectionProps {
  section: ResolvedNoticeSection;
}

export function NoticeSection({ section }: NoticeSectionProps) {
  const { heading, description, items } = section.config;

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="home-notice" aria-labelledby={`notice-${section.id}`}>
      <div className="mb-[24px]">
        <h2 id={`notice-${section.id}`} className="text-[28px] leading-[1.3] font-bold text-[#1e2124]">
          {heading}
        </h2>
        {description && (
          <p className="mt-[8px] text-[16px] leading-[1.6] text-[#555555]">{description}</p>
        )}
      </div>
      <ul className="overflow-hidden rounded-[8px] border border-[#e4e4e4] bg-white p-0">
        {items.map((item, index) => (
          <li key={`notice-${index}`} className="border-b border-[#e4e4e4] last:border-b-0">
            {item.url ? (
              <Link href={item.url} className="flex items-center justify-between gap-[16px] p-[16px] text-inherit no-underline transition-colors duration-150 hover:bg-[#f8f8f8] large:p-[24px]">
                <span className="flex-1 truncate text-[15px] leading-[1.5] text-[#33363d]">{item.label}</span>
                {item.date && (
                  <time className="shrink-0 text-[13px] leading-[1.5] text-[#8a949e]" dateTime={item.date}>
                    {formatDate(item.date)}
                  </time>
                )}
              </Link>
            ) : (
              <div className="flex items-center justify-between gap-[16px] p-[16px] large:p-[24px]">
                <span className="flex-1 truncate text-[15px] leading-[1.5] text-[#33363d]">{item.label}</span>
                {item.date && (
                  <time className="shrink-0 text-[13px] leading-[1.5] text-[#8a949e]" dateTime={item.date}>
                    {formatDate(item.date)}
                  </time>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function formatDate(iso: string): string {
  try {
    const date = new Date(iso);
    if (isNaN(date.getTime())) return iso;
    return date.toLocaleDateString('ko-KR');
  } catch {
    return iso;
  }
}
