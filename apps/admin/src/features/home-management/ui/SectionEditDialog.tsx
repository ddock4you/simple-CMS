'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/shadcn/dialog';

import {
  SECTION_TYPE_DESCRIPTIONS,
  SECTION_TYPE_LABELS,
} from '../model/sectionLabels';
import type { HomeSectionListItem } from '../model/home.types';
import { HeroSectionForm } from './forms/HeroSectionForm';
import { RecommendedSectionForm } from './forms/RecommendedSectionForm';
import { ShortcutSectionForm } from './forms/ShortcutSectionForm';
import { LatestPostsSectionForm } from './forms/LatestPostsSectionForm';
import { CtaSectionForm } from './forms/CtaSectionForm';
import { NoticeSectionForm } from './forms/NoticeSectionForm';

interface SectionEditDialogProps {
  section: HomeSectionListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SectionEditDialog({
  section,
  open,
  onOpenChange,
}: SectionEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        {section && (
          <>
            <DialogHeader>
              <DialogTitle>
                {SECTION_TYPE_LABELS[section.sectionType]} 섹션 편집
              </DialogTitle>
              <DialogDescription>
                {SECTION_TYPE_DESCRIPTIONS[section.sectionType]}
              </DialogDescription>
            </DialogHeader>
            <SectionFormSwitch
              key={section.id}
              section={section}
              onClose={() => onOpenChange(false)}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SectionFormSwitch({
  section,
  onClose,
}: {
  section: HomeSectionListItem;
  onClose: () => void;
}) {
  switch (section.sectionType) {
    case 'HERO':
      return <HeroSectionForm section={section} onClose={onClose} />;
    case 'RECOMMENDED':
      return <RecommendedSectionForm section={section} onClose={onClose} />;
    case 'SHORTCUT':
      return <ShortcutSectionForm section={section} onClose={onClose} />;
    case 'LATEST_POSTS':
      return <LatestPostsSectionForm section={section} onClose={onClose} />;
    case 'CTA':
      return <CtaSectionForm section={section} onClose={onClose} />;
    case 'NOTICE':
      return <NoticeSectionForm section={section} onClose={onClose} />;
  }
}
