import {
  getHomeSections,
  type ResolvedSection,
} from '@/entities/home-section/api/getHomeSections';
import { HeroSection } from '@/features/home-section/ui/HeroSection';
import { BriefIntroSection } from '@/features/home-section/ui/BriefIntroSection';
import { FrequentMenuSection } from '@/features/home-section/ui/FrequentMenuSection';
import { NoticeSection } from '@/features/home-section/ui/NoticeSection';
import { GalleryCollectionSection } from '@/features/home-section/ui/GalleryCollectionSection';

interface HomeSectionsProps {
  sections?: ResolvedSection[];
}

export async function HomeSections({
  sections: providedSections,
}: HomeSectionsProps = {}) {
  const sections = providedSections ?? (await getHomeSections());

  if (sections.length === 0) {
    return (
      <div className="page-container ">
        <p className="py-[24px] text-center text-[#717171]">
          표시할 섹션이 없습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="page-container flex flex-col gap-[40px] pb-[40px] large:gap-[64px] large:pb-[64px]">
      {sections.map((section) => {
        switch (section.sectionType) {
          case 'HERO':
            return <HeroSection key={section.id} section={section} />;
          case 'BRIEF_INTRO':
            return <BriefIntroSection key={section.id} section={section} />;
          case 'FREQUENT_MENU':
            return <FrequentMenuSection key={section.id} section={section} />;
          case 'NOTICE':
            return <NoticeSection key={section.id} section={section} />;
          case 'GALLERY_COLLECTION':
            return (
              <GalleryCollectionSection key={section.id} section={section} />
            );
        }
      })}
    </div>
  );
}
