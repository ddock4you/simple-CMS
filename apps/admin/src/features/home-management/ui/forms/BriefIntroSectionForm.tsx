'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { useUpdateHomeSection } from '../../api/useHomeMutations';
import { useSectionFormDirty } from '../../lib/useSectionFormDirty';
import {
  briefIntroConfigSchema,
  defaultConfigByType,
  type BriefIntroConfigData,
} from '../../model/homeSchemas';
import type { HomeSectionListItem } from '../../model/home.types';
import { BriefIntroFields } from '../fields/BriefIntroFields';
import { SectionFormShell } from './SectionFormShell';

interface BriefIntroSectionFormProps {
  section: HomeSectionListItem;
  onClose: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

export function BriefIntroSectionForm({
  section,
  onClose,
  onDirtyChange,
}: BriefIntroSectionFormProps) {
  const mutation = useUpdateHomeSection(section.id);
  const [title, setTitle] = useState(section.title);
  const [isVisible, setIsVisible] = useState(section.isVisible);
  const [titleError, setTitleError] = useState<string | null>(null);

  const initialConfig =
    briefIntroConfigSchema.safeParse(section.configJson).data ??
    defaultConfigByType.BRIEF_INTRO;

  const form = useForm<BriefIntroConfigData>({
    resolver: zodResolver(briefIntroConfigSchema),
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

    const normalizedConfig: BriefIntroConfigData = {
      ...config,
      detailUrl: config.detailEnabled ? config.detailUrl : null,
      imageUrl: config.imageUrl?.trim() || null,
      imageAlt: config.imageUrl?.trim() ? (config.imageAlt ?? null) : null,
      imageOriginalName: config.imageUrl?.trim()
        ? (config.imageOriginalName ?? null)
        : null,
      mediaId: config.imageUrl?.trim() ? (config.mediaId ?? null) : null,
    };

    mutation.mutate(
      { title, isVisible, configJson: normalizedConfig },
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
      <BriefIntroFields
        register={form.register}
        control={form.control}
        errors={form.formState.errors}
        setValue={form.setValue}
      />
    </SectionFormShell>
  );
}
