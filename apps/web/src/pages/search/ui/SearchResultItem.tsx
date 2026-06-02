import Link from 'next/link';

import type { SearchResult } from '@simple-cms/db';

function formatDate(date: Date | null) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function getResultHref(item: SearchResult) {
  if (item.type === 'subpage') return `/p/${item.slug}`;
  return `/board/${item.boardSlug}/${item.slug}`;
}

function getResultLabel(item: SearchResult) {
  return item.type === 'subpage' ? '페이지' : '게시글';
}

export function SearchResultItem({ item }: { item: SearchResult }) {
  const href = getResultHref(item);
  const label = getResultLabel(item);
  const date = formatDate(item.publishedAt);

  return (
    <li className="border-b border-[#8a949e] pb-[24px] large:pb-[40px]">
      <div className="flex flex-col gap-[16px] large:gap-[24px]">
        <div className="flex flex-wrap items-center gap-[12px] large:gap-[16px]">
          <span className="inline-flex h-[24px] items-center rounded-[4px] bg-[#f2fbf7] px-[8px] text-[15px] leading-[1.5] font-bold text-[#0b6b4f]">
            {label}
          </span>
          {date && (
            <time
              dateTime={new Date(item.publishedAt ?? '').toISOString()}
              className="text-[15px] leading-[1.5] text-[#464c53] large:text-[17px]"
            >
              {date}
            </time>
          )}
        </div>

        <div className="flex flex-col gap-[12px]">
          <Link
            href={href}
            className="text-[19px] leading-[1.5] font-bold text-[#1e2124] no-underline hover:text-[#1e694e] hover:underline"
          >
            {item.title}
          </Link>
          {item.excerpt && (
            <p className="m-0 line-clamp-3 text-[17px] leading-[1.5] text-[#464c53]">
              {item.excerpt}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-[12px] medium:flex-row medium:items-center medium:justify-between large:gap-[24px]">
          <div className="flex flex-wrap items-center gap-[8px] text-[15px] leading-[1.5] text-[#464c53] large:text-[17px]">
            {item.type === 'post' && item.boardName && item.boardSlug ? (
              <>
                <Link
                  href={`/board/${item.boardSlug}`}
                  className="text-inherit no-underline hover:underline"
                >
                  {item.boardName}
                </Link>
                <span aria-hidden="true">›</span>
                <span>게시글</span>
              </>
            ) : (
              <span>페이지</span>
            )}
          </div>
          <Link
            href={href}
            className="inline-flex h-[32px] w-fit items-center justify-center rounded-[4px] border border-[#58616a] px-[12px] text-[15px] leading-[1.5] font-bold text-[#1e2124] no-underline hover:bg-[#f4f5f6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#256ef4]"
          >
            자세히보기
          </Link>
        </div>
      </div>
    </li>
  );
}
