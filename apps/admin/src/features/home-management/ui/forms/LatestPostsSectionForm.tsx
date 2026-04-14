'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { useUpdateHomeSection } from '../../api/useHomeMutations';
import {
  defaultConfigByType,
  latestPostsConfigSchema,
  type LatestPostsConfigData,
} from '../../model/homeSchemas';
import type { HomeSectionListItem } from '../../model/home.types';
import { LatestPostsFields } from '../fields/LatestPostsFields';
import { SectionFormShell } from './SectionFormShell';

interface LatestPostsSectionFormProps {
  section: HomeSectionListItem;
  onClose: () => void;
}

export function LatestPostsSectionForm({
  section,
  onClose,
}: LatestPostsSectionFormProps) {
  const mutation = useUpdateHomeSection(section.id);
  const [title, setTitle] = useState(section.title);
  const [isVisible, setIsVisible] = useState(section.isVisible);
  const [titleError, setTitleError] = useState<string | null>(null);

  const initialConfig =
    latestPostsConfigSchema.safeParse(section.configJson).data ??
    defaultConfigByType.LATEST_POSTS;

  const form = useForm<LatestPostsConfigData>({
    resolver: zodResolver(latestPostsConfigSchema),
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
      <LatestPostsFields
        register={form.register}
        control={form.control}
        errors={form.formState.errors}
      />
    </SectionFormShell>
  );
}
