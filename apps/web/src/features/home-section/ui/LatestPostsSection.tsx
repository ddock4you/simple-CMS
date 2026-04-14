import Link from 'next/link';

import type { ResolvedLatestPostsSection } from '@/entities/home-section/api/getHomeSections';

interface LatestPostsSectionProps {
  section: ResolvedLatestPostsSection;
}

export function LatestPostsSection({ section }: LatestPostsSectionProps) {
  const { heading, description } = section.config;
  const { items, boardName, boardSlug } = section;

  return (
    <section
      className="home-latest-posts"
      aria-labelledby={`latest-posts-${section.id}`}
    >
      <div className="home-section-header">
        <h2 id={`latest-posts-${section.id}`} className="home-section-title">
          {heading}
        </h2>
        {description && (
          <p className="home-section-description">{description}</p>
        )}
      </div>

      {items.length === 0 ? (
        <p className="home-empty-message">아직 게시글이 없습니다.</p>
      ) : (
        <>
          <ul className="home-latest-posts-list">
            {items.map((item) => (
              <li key={item.id} className="home-latest-posts-item">
                <Link href={item.href} className="home-latest-posts-link">
                  <span className="home-latest-posts-title">{item.title}</span>
                  {item.publishedAt && (
                    <time
                      className="home-latest-posts-date"
                      dateTime={item.publishedAt.toISOString()}
                    >
                      {item.publishedAt.toLocaleDateString('ko-KR')}
                    </time>
                  )}
                </Link>
              </li>
            ))}
          </ul>
          {boardSlug && (
            <div className="home-section-more">
              <Link
                href={`/board/${boardSlug}`}
                className="home-section-more-link"
              >
                {boardName ?? '게시판'} 전체 보기 →
              </Link>
            </div>
          )}
        </>
      )}
    </section>
  );
}
