import Link from 'next/link';

import type { ResolvedBriefIntroSection } from '@/entities/home-section/api/getHomeSections';

interface BriefIntroSectionProps {
  section: ResolvedBriefIntroSection;
}

export function BriefIntroSection({ section }: BriefIntroSectionProps) {
  const { heading, content, detailEnabled, detailUrl, imageUrl, imageAlt } =
    section.config;

  if (!heading.trim() || !content.trim()) {
    return null;
  }

  const hasImage = Boolean(imageUrl?.trim());
  const showDetailLink = detailEnabled && Boolean(detailUrl?.trim());

  return (
    <section
      className="relative left-1/2 w-screen -translate-x-1/2 bg-[#eef2f7] py-[48px] px-[16px] large:py-[64px] large:px-0"
      aria-labelledby={`brief-intro-${section.id}`}
    >
      <div
        className={
          hasImage
            ? 'mx-auto flex w-full max-w-[996px] flex-col gap-[24px] large:flex-row large:gap-[40px]'
            : 'mx-auto flex w-full max-w-[996px] flex-col gap-[16px]'
        }
      >
        {hasImage && (
          <div className="h-[258px] w-full shrink-0 overflow-hidden rounded-[12px] bg-black/10 large:h-[322px] large:w-[410px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl ?? ''}
              alt={imageAlt || ''}
              loading="lazy"
              decoding="async"
              className="size-full object-cover"
            />
          </div>
        )}

        <div className="flex flex-1 flex-col gap-[16px] large:gap-[24px] large:py-[24px]">
          <div className="flex flex-col gap-[8px]">
            <h2
              id={`brief-intro-${section.id}`}
              className="whitespace-pre-line text-[28px] leading-[1.5] font-bold tracking-[0.0357em] text-[#1e2124] large:text-[32px] large:tracking-[0.0313em]"
            >
              {heading}
            </h2>
            <p className="whitespace-pre-line text-[17px] leading-[1.8] text-[#464c53]">
              {content}
            </p>
          </div>

          {showDetailLink && (
            <Link
              href={detailUrl ?? '#'}
              className="inline-flex h-[32px] w-fit items-center gap-[4px] px-[2px] text-[17px] leading-[1.5] text-[#1e2124] no-underline hover:underline"
            >
              <span>자세히보기</span>
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="size-[20px]"
                fill="none"
              >
                <path
                  d="M6 14L14 6M8 6H14V12"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
