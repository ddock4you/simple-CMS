'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { useUpdateHomeSection } from '../../api/useHomeMutations';
import {
  defaultConfigByType,
  noticeConfigSchema,
  type NoticeConfigData,
} from '../../model/homeSchemas';
import type { HomeSectionListItem } from '../../model/home.types';
import { NoticeFields } from '../fields/NoticeFields';
import { SectionFormShell } from './SectionFormShell';

interface NoticeSectionFormProps {
  section: HomeSectionListItem;
  onClose: () => void;
}

export function NoticeSectionForm({
  section,
  onClose,
}: NoticeSectionFormProps) {
  const mutation = useUpdateHomeSection(section.id);
  const [title, setTitle] = useState(section.title);
  const [isVisible, setIsVisible] = useState(section.isVisible);
  const [titleError, setTitleError] = useState<string | null>(null);

  const initialConfig =
    noticeConfigSchema.safeParse(section.configJson).data ??
    defaultConfigByType.NOTICE;

  const form = useForm<NoticeConfigData>({
    resolver: zodResolver(noticeConfigSchema),
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
      <NoticeFields
        register={form.register}
        control={form.control}
        errors={form.formState.errors}
      />
    </SectionFormShell>
  );
}
