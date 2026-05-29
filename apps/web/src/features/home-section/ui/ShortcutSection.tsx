import Link from 'next/link';

import type { ResolvedShortcutSection } from '@/entities/home-section/api/getHomeSections';

interface ShortcutSectionProps {
  section: ResolvedShortcutSection;
}

export function ShortcutSection({ section }: ShortcutSectionProps) {
  const { heading, description, items } = section.config;

  if (items.length === 0) {
    return null;
  }

  return (
    <section
      className="home-shortcut"
      aria-labelledby={`shortcut-${section.id}`}
    >
      <div className="mb-[24px]">
        <h2 id={`shortcut-${section.id}`} className="text-[28px] leading-[1.3] font-bold text-[#1e2124]">
          {heading}
        </h2>
        {description && (
          <p className="mt-[8px] text-[16px] leading-[1.6] text-[#555555]">{description}</p>
        )}
      </div>
      <ul className="grid list-none grid-cols-2 gap-[16px] p-0 medium:grid-cols-4 large:gap-[24px]">
        {items.map((item, index) => (
          <li key={`shortcut-${index}`} className="rounded-[8px] border border-[#e4e4e4] bg-white transition-[border-color,box-shadow] duration-150 hover:border-[#256ef4] hover:shadow-[0_2px_8px_rgba(37,110,244,0.12)]">
            <Link href={item.url} className="flex h-full flex-col justify-center gap-[4px] p-[16px] text-center text-inherit no-underline large:p-[24px]">
              <span className="text-[16px] leading-[1.5] font-semibold text-[#1e2124]">{item.label}</span>
              {item.description && (
                <span className="text-[13px] leading-[1.5] text-[#717171]">{item.description}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
