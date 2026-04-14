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
      <div className="home-section-header">
        <h2 id={`shortcut-${section.id}`} className="home-section-title">
          {heading}
        </h2>
        {description && (
          <p className="home-section-description">{description}</p>
        )}
      </div>
      <ul className="home-shortcut-grid">
        {items.map((item, index) => (
          <li key={`shortcut-${index}`} className="home-shortcut-card">
            <Link href={item.url} className="home-shortcut-link">
              <span className="home-shortcut-label">{item.label}</span>
              {item.description && (
                <span className="home-shortcut-desc">{item.description}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
