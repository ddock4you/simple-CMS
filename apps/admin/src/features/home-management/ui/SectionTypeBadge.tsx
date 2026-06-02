import { Badge } from '@/shared/ui/shadcn/badge';

import { SECTION_TYPE_LABELS } from '../model/sectionLabels';
import type { HomeSectionType } from '../model/home.types';

const VARIANT_BY_TYPE: Record<
  HomeSectionType,
  'default' | 'secondary' | 'outline'
> = {
  HERO: 'default',
  BRIEF_INTRO: 'default',
  RECOMMENDED: 'default',
  SUB_CAROUSEL: 'default',
  FREQUENT_MENU: 'secondary',
  SHORTCUT: 'secondary',
  LATEST_POSTS: 'secondary',
  GALLERY_COLLECTION: 'secondary',
  CTA: 'outline',
  NOTICE: 'outline',
};

export function SectionTypeBadge({
  sectionType,
}: {
  sectionType: HomeSectionType;
}) {
  return (
    <Badge variant={VARIANT_BY_TYPE[sectionType]}>
      {SECTION_TYPE_LABELS[sectionType]}
    </Badge>
  );
}
