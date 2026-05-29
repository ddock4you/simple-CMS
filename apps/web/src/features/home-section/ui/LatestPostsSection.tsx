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
      <div className="mb-[24px]">
        <h2 id={`latest-posts-${section.id}`} className="text-[28px] leading-[1.3] font-bold text-[#1e2124]">
          {heading}
        </h2>
        {description && (
          <p className="mt-[8px] text-[16px] leading-[1.6] text-[#555555]">{description}</p>
        )}
      </div>

      {items.length === 0 ? (
        <p className="py-[24px] text-center text-[#717171]">아직 게시글이 없습니다.</p>
      ) : (
        <>
          <ul className="list-none border-t-2 border-[#256ef4] p-0">
            {items.map((item) => (
              <li key={item.id} className="border-b border-[#e4e4e4]">
                <Link href={item.href} className="flex items-center justify-between gap-[16px] py-[16px] text-inherit no-underline transition-[background-color,padding] duration-150 hover:bg-[#f8f8f8] hover:px-[8px]">
                  <span className="flex-1 truncate text-[16px] leading-[1.5] font-medium text-[#1e2124]">{item.title}</span>
                  {item.publishedAt && (
                    <time
                      className="shrink-0 text-[13px] leading-[1.5] text-[#8a949e]"
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
            <div className="mt-[20px] text-right">
              <Link
                href={`/board/${boardSlug}`}
                className="text-[15px] leading-[1.5] font-medium text-[#256ef4] no-underline hover:underline"
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
