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

      <header className="pt-[40px] pb-[24px]">
        <h1 className="mb-[24px] text-[32px] leading-[1.3] font-bold text-[#1e2124]">검색</h1>
        <SearchForm defaultValue={query} />
      </header>

      {!query ? (
        <p className="py-[40px] text-center text-[#717171]">검색어를 입력해 주세요.</p>
      ) : !results || results.total === 0 ? (
        <p className="py-[40px] text-center text-[#717171]">
          &ldquo;{query}&rdquo;에 대한 검색 결과가 없습니다.
        </p>
      ) : (
        <>
          <p className="border-b-2 border-[#256ef4] pb-[20px] text-[15px] leading-[1.6] text-[#555555]">
            &ldquo;{query}&rdquo;에 대한 결과{' '}
            <strong>{results.total}</strong>건
          </p>
          <ul className="list-none p-0">
            {results.items.map((item) => {
              const href =
                item.type === 'subpage'
                  ? `/p/${item.slug}`
                  : `/board/${item.boardSlug}/${item.slug}`;

              return (
                <li key={`${item.type}-${item.id}`} className="border-b border-[#e4e4e4] py-[24px]">
                  <div className="mb-[8px] flex items-center gap-[8px]">
                    <span
                      className={item.type === 'subpage' ? 'inline-block rounded-[4px] bg-[#eff5ff] px-[8px] py-[2px] text-[12px] leading-[1.5] font-semibold text-[#256ef4]' : 'inline-block rounded-[4px] bg-[#eef7f0] px-[8px] py-[2px] text-[12px] leading-[1.5] font-semibold text-[#008a1e]'}
                    >
                      {item.type === 'subpage' ? '페이지' : '게시글'}
                    </span>
                    {item.type === 'post' && item.boardName && item.boardSlug && (
                      <Link
                        href={`/board/${item.boardSlug}`}
                        className="text-[13px] leading-[1.5] text-[#8a949e] no-underline hover:underline"
                      >
                        {item.boardName}
                      </Link>
                    )}
                  </div>
                  <Link href={href} className="block text-[18px] leading-[1.4] font-semibold text-[#33363d] no-underline hover:text-[#256ef4] hover:underline">
                    {item.title}
                  </Link>
                  {item.excerpt && (
                    <p className="mt-[8px] line-clamp-2 overflow-hidden text-[14px] leading-[1.6] text-[#555555]">{item.excerpt}</p>
                  )}
                  {item.publishedAt && (
                    <span className="mt-[8px] block text-[13px] leading-[1.5] text-[#8a949e]">
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
