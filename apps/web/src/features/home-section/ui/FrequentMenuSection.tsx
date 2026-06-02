import Link from 'next/link';

import type { ResolvedFrequentMenuSection } from '@/entities/home-section/api/getHomeSections';

interface FrequentMenuSectionProps {
  section: ResolvedFrequentMenuSection;
}

export function FrequentMenuSection({ section }: FrequentMenuSectionProps) {
  const { heading } = section.config;
  const items = section.items.slice(0, 6);

  if (items.length === 0) return null;

  return (
    <section
      aria-labelledby={`frequent-menu-${section.id}`}
      className="flex flex-col gap-[20px] large:gap-[24px]"
    >
      <div className="flex items-center gap-[12px] large:gap-[16px]">
        <h2
          id={`frequent-menu-${section.id}`}
          className="text-[28px] leading-[1.5] font-bold tracking-[0.0357em] text-[#1e2124] large:text-[32px] large:tracking-[0.0313em]"
        >
          {heading}
        </h2>
      </div>

      <ul className="grid list-none grid-cols-[repeat(auto-fit,minmax(156px,1fr))] gap-[16px] p-0">
        {items.map((item) => (
          <li key={`${item.href}-${item.title}`}>
            <FrequentMenuCard item={item} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function FrequentMenuCard({
  item,
}: {
  item: ResolvedFrequentMenuSection['items'][number];
}) {
  const className =
    'group flex min-h-[117px] flex-col items-center justify-center gap-[8px] rounded-[12px] border border-[#b1b8be] bg-white px-[12px] py-[24px] text-center text-inherit no-underline transition-[border-color,box-shadow,transform] duration-150 hover:border-[#256ef4] hover:shadow-[0_4px_14px_rgba(37,110,244,0.14)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#256ef4] large:gap-[12px]';

  const content = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.iconUrl}
        alt={item.iconAlt}
        className="size-[32px] object-contain transition-transform duration-150 group-hover:scale-105"
        loading="lazy"
      />
      <span className="break-keep text-[15px] leading-[1.8] font-bold text-[#1e2124]">
        {item.title}
      </span>
    </>
  );

  if (isExternalHref(item.href) || item.openInNewTab) {
    return (
      <a
        href={item.href}
        className={className}
        target={item.openInNewTab ? '_blank' : undefined}
        rel={item.openInNewTab ? 'noopener noreferrer' : undefined}
      >
        {content}
      </a>
    );
  }

  return (
    <Link href={item.href} className={className}>
      {content}
    </Link>
  );
}

function isExternalHref(href: string): boolean {
  return /^https?:\/\//.test(href);
}
