'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { useUpdateHomeSection } from '../../api/useHomeMutations';
import { useSectionFormDirty } from '../../lib/useSectionFormDirty';
import {
  defaultConfigByType,
  frequentMenuConfigSchema,
  type FrequentMenuConfigData,
} from '../../model/homeSchemas';
import type { HomeSectionListItem } from '../../model/home.types';
import { FrequentMenuFields } from '../fields/FrequentMenuFields';
import { SectionFormShell } from './SectionFormShell';

interface FrequentMenuSectionFormProps {
  section: HomeSectionListItem;
  onClose: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

export function FrequentMenuSectionForm({
  section,
  onClose,
  onDirtyChange,
}: FrequentMenuSectionFormProps) {
  const mutation = useUpdateHomeSection(section.id);
  const [title, setTitle] = useState(section.title);
  const [isVisible, setIsVisible] = useState(section.isVisible);
  const [titleError, setTitleError] = useState<string | null>(null);

  const initialConfig =
    frequentMenuConfigSchema.safeParse(section.configJson).data ??
    defaultConfigByType.FREQUENT_MENU;

  const form = useForm<FrequentMenuConfigData>({
    resolver: zodResolver(frequentMenuConfigSchema),
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
    mutation.mutate(
      { title, isVisible, configJson: config },
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
      <FrequentMenuFields
        register={form.register}
        control={form.control}
        setValue={form.setValue}
        errors={form.formState.errors}
      />
    </SectionFormShell>
  );
}
