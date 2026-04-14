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
      <div className="home-section-header">
        <h2 id={`notice-${section.id}`} className="home-section-title">
          {heading}
        </h2>
        {description && (
          <p className="home-section-description">{description}</p>
        )}
      </div>
      <ul className="home-notice-list">
        {items.map((item, index) => (
          <li key={`notice-${index}`} className="home-notice-item">
            {item.url ? (
              <Link href={item.url} className="home-notice-link">
                <span className="home-notice-label">{item.label}</span>
                {item.date && (
                  <time className="home-notice-date" dateTime={item.date}>
                    {formatDate(item.date)}
                  </time>
                )}
              </Link>
            ) : (
              <div className="home-notice-link">
                <span className="home-notice-label">{item.label}</span>
                {item.date && (
                  <time className="home-notice-date" dateTime={item.date}>
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
