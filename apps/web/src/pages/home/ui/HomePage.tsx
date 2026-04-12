import Link from 'next/link';

import { getRecentSubpages } from '@/entities/subpage/api/getSubpageList';

export async function HomePage() {
  const subpages = await getRecentSubpages(5);

  return (
    <div className="page-container">
      <section className="hero-section">
        <h1 className="hero-title">Simple CMS</h1>
        <p className="hero-description">
          공공 서비스를 위한 콘텐츠 관리 시스템
        </p>
      </section>

      <section className="recent-section">
        <h2 className="section-title">최근 게시된 페이지</h2>
        {subpages.length > 0 ? (
          <ul className="subpage-list">
            {subpages.map((subpage) => (
              <li key={subpage.id} className="subpage-item">
                <Link href={`/p/${subpage.slug}`} className="subpage-link">
                  <span className="subpage-item-title">{subpage.title}</span>
                  {subpage.seoDescription && (
                    <span className="subpage-item-desc">
                      {subpage.seoDescription}
                    </span>
                  )}
                  {subpage.publishedAt && (
                    <time
                      className="subpage-item-date"
                      dateTime={subpage.publishedAt.toISOString()}
                    >
                      {subpage.publishedAt.toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </time>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-message">아직 게시된 콘텐츠가 없습니다.</p>
        )}
      </section>
    </div>
  );
}
