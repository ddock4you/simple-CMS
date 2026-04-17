'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { useUpdateHomeSection } from '../../api/useHomeMutations';
import { useSectionFormDirty } from '../../lib/useSectionFormDirty';
import {
  defaultConfigByType,
  shortcutConfigSchema,
  type ShortcutConfigData,
} from '../../model/homeSchemas';
import type { HomeSectionListItem } from '../../model/home.types';
import { ShortcutFields } from '../fields/ShortcutFields';
import { SectionFormShell } from './SectionFormShell';

interface ShortcutSectionFormProps {
  section: HomeSectionListItem;
  onClose: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

export function ShortcutSectionForm({
  section,
  onClose,
  onDirtyChange,
}: ShortcutSectionFormProps) {
  const mutation = useUpdateHomeSection(section.id);
  const [title, setTitle] = useState(section.title);
  const [isVisible, setIsVisible] = useState(section.isVisible);
  const [titleError, setTitleError] = useState<string | null>(null);

  const initialConfig =
    shortcutConfigSchema.safeParse(section.configJson).data ??
    defaultConfigByType.SHORTCUT;

  const form = useForm<ShortcutConfigData>({
    resolver: zodResolver(shortcutConfigSchema),
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
      <ShortcutFields
        register={form.register}
        control={form.control}
        errors={form.formState.errors}
      />
    </SectionFormShell>
  );
}
