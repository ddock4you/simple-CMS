import Link from 'next/link';

import { Breadcrumb } from '@/shared/ui/KrdsBreadcrumb';

import type { SearchResponse } from '@simple-cms/db';

import { PaginationNav } from '@/shared/ui/PaginationNav';
import { SearchForm } from '@/features/search/ui/SearchForm';

interface SearchPageProps {
  query: string;
  results: SearchResponse | null;
}

function formatDate(date: Date | null) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function SearchPage({ query, results }: SearchPageProps) {
  return (
    <div className="page-container">
      <Breadcrumb
        items={[
          { text: '홈', href: '/' },
          { text: '검색', href: '#' },
        ]}
        ariaLabel="현재 위치"
      />

      <header className="search-header">
        <h1 className="search-title">검색</h1>
        <SearchForm defaultValue={query} />
      </header>

      {!query ? (
        <p className="empty-message">검색어를 입력해 주세요.</p>
      ) : !results || results.total === 0 ? (
        <p className="empty-message">
          &ldquo;{query}&rdquo;에 대한 검색 결과가 없습니다.
        </p>
      ) : (
        <>
          <p className="search-results-summary">
            &ldquo;{query}&rdquo;에 대한 결과{' '}
            <strong>{results.total}</strong>건
          </p>
          <ul className="search-result-list">
            {results.items.map((item) => {
              const href =
                item.type === 'subpage'
                  ? `/p/${item.slug}`
                  : `/board/${item.boardSlug}/${item.slug}`;

              return (
                <li key={`${item.type}-${item.id}`} className="search-result-item">
                  <div className="search-result-top">
                    <span
                      className={`search-result-badge search-result-badge--${item.type}`}
                    >
                      {item.type === 'subpage' ? '페이지' : '게시글'}
                    </span>
                    {item.type === 'post' && item.boardName && item.boardSlug && (
                      <Link
                        href={`/board/${item.boardSlug}`}
                        className="search-result-board"
                      >
                        {item.boardName}
                      </Link>
                    )}
                  </div>
                  <Link href={href} className="search-result-title">
                    {item.title}
                  </Link>
                  {item.excerpt && (
                    <p className="search-result-excerpt">{item.excerpt}</p>
                  )}
                  {item.publishedAt && (
                    <span className="search-result-date">
                      {formatDate(item.publishedAt)}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          <PaginationNav
            totalPages={results.totalPages}
            currentPage={results.page}
          />
        </>
      )}
    </div>
  );
}
