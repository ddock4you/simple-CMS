'use client';

import { useState } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/shadcn/dialog';
import { useDialogDirtyGuard } from '@/shared/lib/useDialogDirtyGuard';
import { ConfirmLeaveDialog } from '@/shared/ui/ConfirmLeaveDialog';

import {
  SECTION_TYPE_DESCRIPTIONS,
  SECTION_TYPE_LABELS,
} from '../model/sectionLabels';
import type { HomeSectionListItem } from '../model/home.types';
import { HeroSectionForm } from './forms/HeroSectionForm';
import { BriefIntroSectionForm } from './forms/BriefIntroSectionForm';
import { FrequentMenuSectionForm } from './forms/FrequentMenuSectionForm';
import { NoticeSectionForm } from './forms/NoticeSectionForm';
import { GalleryCollectionSectionForm } from './forms/GalleryCollectionSectionForm';

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
  const [dirty, setDirty] = useState(false);

  const { safeOnOpenChange, confirmDialogProps } = useDialogDirtyGuard(
    dirty,
    onOpenChange,
  );

  return (
    <Dialog open={open} onOpenChange={safeOnOpenChange} disablePointerDismissal>
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
              onDirtyChange={setDirty}
            />
          </>
        )}
      </DialogContent>
      <ConfirmLeaveDialog {...confirmDialogProps} />
    </Dialog>
  );
}

function SectionFormSwitch({
  section,
  onClose,
  onDirtyChange,
}: {
  section: HomeSectionListItem;
  onClose: () => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  switch (section.sectionType) {
    case 'HERO':
      return (
        <HeroSectionForm
          section={section}
          onClose={onClose}
          onDirtyChange={onDirtyChange}
        />
      );
    case 'BRIEF_INTRO':
      return (
        <BriefIntroSectionForm
          section={section}
          onClose={onClose}
          onDirtyChange={onDirtyChange}
        />
      );
    case 'FREQUENT_MENU':
      return (
        <FrequentMenuSectionForm
          section={section}
          onClose={onClose}
          onDirtyChange={onDirtyChange}
        />
      );
    case 'NOTICE':
      return (
        <NoticeSectionForm
          section={section}
          onClose={onClose}
          onDirtyChange={onDirtyChange}
        />
      );
    case 'GALLERY_COLLECTION':
      return (
        <GalleryCollectionSectionForm
          section={section}
          onClose={onClose}
          onDirtyChange={onDirtyChange}
        />
      );
  }
}
