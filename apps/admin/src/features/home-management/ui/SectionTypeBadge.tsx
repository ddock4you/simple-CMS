import { Badge } from '@/shared/ui/shadcn/badge';

import { SECTION_TYPE_LABELS } from '../model/sectionLabels';
import type { HomeSectionType } from '../model/home.types';

const VARIANT_BY_TYPE: Record<
  HomeSectionType,
  'default' | 'secondary' | 'outline'
> = {
  HERO: 'default',
  RECOMMENDED: 'default',
  SUB_CAROUSEL: 'default',
  SHORTCUT: 'secondary',
  LATEST_POSTS: 'secondary',
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
