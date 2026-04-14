'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { useUpdateHomeSection } from '../../api/useHomeMutations';
import {
  defaultConfigByType,
  recommendedConfigSchema,
  type RecommendedConfigData,
} from '../../model/homeSchemas';
import type { HomeSectionListItem } from '../../model/home.types';
import { RecommendedFields } from '../fields/RecommendedFields';
import { SectionFormShell } from './SectionFormShell';

interface RecommendedSectionFormProps {
  section: HomeSectionListItem;
  onClose: () => void;
}

export function RecommendedSectionForm({
  section,
  onClose,
}: RecommendedSectionFormProps) {
  const mutation = useUpdateHomeSection(section.id);
  const [title, setTitle] = useState(section.title);
  const [isVisible, setIsVisible] = useState(section.isVisible);
  const [titleError, setTitleError] = useState<string | null>(null);

  const initialConfig =
    recommendedConfigSchema.safeParse(section.configJson).data ??
    defaultConfigByType.RECOMMENDED;

  const form = useForm<RecommendedConfigData>({
    resolver: zodResolver(recommendedConfigSchema),
    defaultValues: initialConfig,
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
      <RecommendedFields
        register={form.register}
        control={form.control}
        errors={form.formState.errors}
        setValue={form.setValue}
      />
    </SectionFormShell>
  );
}
