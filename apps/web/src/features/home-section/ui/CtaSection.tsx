import Link from 'next/link';

import type { ResolvedCtaSection } from '@/entities/home-section/api/getHomeSections';

interface CtaSectionProps {
  section: ResolvedCtaSection;
}

export function CtaSection({ section }: CtaSectionProps) {
  const { heading, description, buttonLabel, buttonUrl } = section.config;

  return (
    <section className="rounded-[8px] border-l-4 border-[#256ef4] bg-[#f4f5f6] p-[16px] large:p-[24px]" aria-labelledby={`cta-${section.id}`}>
      <div className="flex flex-wrap items-center justify-between gap-[24px]">
        <div className="min-w-[240px] flex-1">
          <h2 id={`cta-${section.id}`} className="text-[24px] leading-[1.3] font-bold text-[#1e2124]">
            {heading}
          </h2>
          {description && (
            <p className="mt-[8px] text-[15px] leading-[1.6] text-[#555555]">{description}</p>
          )}
        </div>
        <Link href={buttonUrl} className="shrink-0 rounded-[6px] bg-[#256ef4] px-[24px] py-[12px] text-[15px] leading-[1.5] font-semibold text-white no-underline transition-[opacity,transform] duration-150 hover:-translate-y-[1px] hover:opacity-90">
          {buttonLabel}
        </Link>
      </div>
    </section>
  );
}
