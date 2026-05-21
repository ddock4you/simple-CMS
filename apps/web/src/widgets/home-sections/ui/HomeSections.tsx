import {
  getHomeSections,
  type ResolvedSection,
} from '@/entities/home-section/api/getHomeSections';
import { HeroSection } from '@/features/home-section/ui/HeroSection';
import { RecommendedSection } from '@/features/home-section/ui/RecommendedSection';
import { ShortcutSection } from '@/features/home-section/ui/ShortcutSection';
import { LatestPostsSection } from '@/features/home-section/ui/LatestPostsSection';
import { CtaSection } from '@/features/home-section/ui/CtaSection';
import { NoticeSection } from '@/features/home-section/ui/NoticeSection';

interface HomeSectionsProps {
  sections?: ResolvedSection[];
}

export async function HomeSections({ sections: providedSections }: HomeSectionsProps = {}) {
  const sections = providedSections ?? (await getHomeSections());

  if (sections.length === 0) {
    return (
      <div className="home-empty-wrapper">
        <p className="home-empty-message">표시할 섹션이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="home-sections">
      {sections.map((section) => {
        switch (section.sectionType) {
          case 'HERO':
            return <HeroSection key={section.id} section={section} />;
          case 'RECOMMENDED':
            return <RecommendedSection key={section.id} section={section} />;
          case 'SHORTCUT':
            return <ShortcutSection key={section.id} section={section} />;
          case 'LATEST_POSTS':
            return <LatestPostsSection key={section.id} section={section} />;
          case 'CTA':
            return <CtaSection key={section.id} section={section} />;
          case 'NOTICE':
            return <NoticeSection key={section.id} section={section} />;
        }
      })}
    </div>
  );
}
