'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { useUpdateHomeSection } from '../../api/useHomeMutations';
import { useSectionFormDirty } from '../../lib/useSectionFormDirty';
import {
  defaultConfigByType,
  galleryCollectionConfigSchema,
  type GalleryCollectionConfigData,
} from '../../model/homeSchemas';
import type { HomeSectionListItem } from '../../model/home.types';
import { GalleryCollectionFields } from '../fields/GalleryCollectionFields';
import { SectionFormShell } from './SectionFormShell';

interface GalleryCollectionSectionFormProps {
  section: HomeSectionListItem;
  onClose: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

export function GalleryCollectionSectionForm({
  section,
  onClose,
  onDirtyChange,
}: GalleryCollectionSectionFormProps) {
  const mutation = useUpdateHomeSection(section.id);
  const [title, setTitle] = useState(section.title);
  const [isVisible, setIsVisible] = useState(section.isVisible);
  const [titleError, setTitleError] = useState<string | null>(null);

  const initialConfig =
    galleryCollectionConfigSchema.safeParse(section.configJson).data ??
    defaultConfigByType.GALLERY_COLLECTION;

  const form = useForm<GalleryCollectionConfigData>({
    resolver: zodResolver(galleryCollectionConfigSchema),
    defaultValues: initialConfig,
  });

  useSectionFormDirty({
    form,
    title,
    isVisible,
    section,
    mutationPending: mutation.isPending,
    mutationSuccess: mutation.isSuccess,
    onDirtyChange,
  });

  const onSubmit = form.handleSubmit((config) => {
    if (!title.trim()) {
      setTitleError('제목을 입력해주세요.');
      return;
    }
    if (title.length > 200) {
      setTitleError('제목은 200자 이하여야 합니다.');
      return;
    }
    setTitleError(null);
    const boardTabLabels = normalizeBoardTabLabels(
      config.boardIds,
      config.boardTabLabels,
    );
    mutation.mutate(
      {
        title,
        isVisible,
        configJson: {
          ...config,
          boardTabLabels,
        },
      },
      { onSuccess: onClose },
    );
  });

  return (
    <SectionFormShell
      title={title}
      onTitleChange={setTitle}
      isVisible={isVisible}
      onIsVisibleChange={setIsVisible}
      titleError={titleError}
      isPending={mutation.isPending}
      onSubmit={onSubmit}
      onCancel={onClose}
    >
      <GalleryCollectionFields
        register={form.register}
        control={form.control}
        errors={form.formState.errors}
      />
    </SectionFormShell>
  );
}

function normalizeBoardTabLabels(
  boardIds: string[],
  rawLabels: Record<string, string | null | undefined> | undefined,
): Record<string, string> {
  const labels: Record<string, string> = {};

  for (const boardId of boardIds) {
    const label = rawLabels?.[boardId]?.trim();
    if (label) {
      labels[boardId] = label;
    }
  }

  return labels;
}
