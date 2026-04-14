import Link from 'next/link';

import type { ResolvedCtaSection } from '@/entities/home-section/api/getHomeSections';

interface CtaSectionProps {
  section: ResolvedCtaSection;
}

export function CtaSection({ section }: CtaSectionProps) {
  const { heading, description, buttonLabel, buttonUrl } = section.config;

  return (
    <section className="home-cta" aria-labelledby={`cta-${section.id}`}>
      <div className="home-cta-inner">
        <div className="home-cta-text">
          <h2 id={`cta-${section.id}`} className="home-cta-heading">
            {heading}
          </h2>
          {description && (
            <p className="home-cta-description">{description}</p>
          )}
        </div>
        <Link href={buttonUrl} className="home-cta-button">
          {buttonLabel}
        </Link>
      </div>
    </section>
  );
}
