import Link from 'next/link';

import type { SearchContentType, SearchResponse } from '@simple-cms/db';

import { SearchInputForm } from '@/features/search/ui/SearchInputForm';
import { PaginationNav } from '@/shared/ui/PaginationNav';
import { Breadcrumb } from '@/shared/ui/KrdsBreadcrumb';

import { SearchResultItem } from './SearchResultItem';

interface SearchPageProps {
  query: string;
  results: SearchResponse | null;
  type: SearchContentType;
}

const SEARCH_TABS = [
  { type: 'all', label: '전체' },
  { type: 'subpage', label: '페이지' },
  { type: 'post', label: '게시글' },
] satisfies readonly { type: SearchContentType; label: string }[];

function buildTabHref(query: string, type: SearchContentType) {
  const params = new URLSearchParams();
  params.set('q', query);
  if (type !== 'all') params.set('type', type);
  return `/search?${params.toString()}`;
}

function getCount(results: SearchResponse | null, type: SearchContentType) {
  return results?.counts[type] ?? 0;
}

function SearchTabs({
  query,
  results,
  activeType,
}: {
  query: string;
  results: SearchResponse | null;
  activeType: SearchContentType;
}) {
  return (
    <nav aria-label="검색 결과 유형" className="w-full overflow-x-auto">
      <ul className="m-0 flex min-w-max list-none rounded-[8px] border border-[#b1b8be] p-0">
        {SEARCH_TABS.map((tab, index) => {
          const active = tab.type === activeType;
          const count = getCount(results, tab.type).toLocaleString('ko-KR');
          const roundedClass =
            index === 0
              ? 'rounded-l-[8px]'
              : index === SEARCH_TABS.length - 1
                ? 'rounded-r-[8px]'
                : '';

          return (
            <li key={tab.type} className="flex-1">
              <Link
                href={buildTabHref(query, tab.type)}
                aria-current={active ? 'page' : undefined}
                className={`flex h-[48px] items-center justify-center whitespace-nowrap px-[12px] text-[17px] leading-[1.5] font-bold no-underline large:h-[56px] large:px-[16px] large:text-[19px] ${roundedClass} ${
                  active
                    ? 'bg-[#063a74] text-white'
                    : 'border-r border-[#b1b8be] text-[#464c53] hover:bg-[#f4f5f6]'
                }`}
              >
                {tab.label}({count})
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function SearchPage({ query, results, type }: SearchPageProps) {
  const hasResults = Boolean(results && results.total > 0);

  return (
    <div className="pb-[64px]">
      <div className="page-container">
        <div className="pb-[32px] large:pb-[40px]">
          <div className="py-[16px] pb-[32px] large:py-[24px] large:pb-[40px]">
            <Breadcrumb
              items={[
                { text: '홈', href: '/' },
                { text: '통합검색', href: '/search' },
              ]}
              ariaLabel="현재 위치"
            />
          </div>
          <h1 className="m-0 text-[32px] leading-[1.5] font-bold tracking-[0.0313em] text-[#1e2124]">
            통합검색
          </h1>
        </div>
      </div>

      <section className="bg-[#eef2f7] py-[24px] large:py-[64px]">
        <div className="mx-auto w-full px-[16px] large:w-[792px] large:px-0">
          <SearchInputForm
            action="/search"
            defaultValue={query}
            inputId="search-result-input"
            label="통합검색"
            variant="xlarge"
            hiddenFields={type === 'all' ? undefined : { type }}
          />
        </div>
      </section>

      <section className="page-container py-[40px] large:py-[64px]">
        {!query ? (
          <p className="m-0 py-[40px] text-center text-[17px] leading-[1.5] text-[#464c53]">
            검색어를 입력해 주세요.
          </p>
        ) : (
          <div className="flex flex-col items-center gap-[32px] large:gap-[40px]">
            <SearchTabs query={query} results={results} activeType={type} />

            {!hasResults ? (
              <p className="m-0 py-[40px] text-center text-[17px] leading-[1.5] text-[#464c53]">
                &ldquo;{query}&rdquo;에 대한 검색 결과가 없습니다.
              </p>
            ) : (
              <>
                <p className="sr-only">
                  &ldquo;{query}&rdquo;에 대한 {results?.total ?? 0}건의 검색
                  결과
                </p>
                <ul className="m-0 flex w-full list-none flex-col gap-[32px] p-0 large:gap-[40px]">
                  {results?.items.map((item) => (
                    <SearchResultItem
                      key={`${item.type}-${item.id}`}
                      item={item}
                    />
                  ))}
                </ul>
                {results && (
                  <PaginationNav
                    totalPages={results.totalPages}
                    currentPage={results.page}
                  />
                )}
              </>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
