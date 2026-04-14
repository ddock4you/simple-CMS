'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { useUpdateHomeSection } from '../../api/useHomeMutations';
import {
  defaultConfigByType,
  heroConfigSchema,
  type HeroConfigData,
} from '../../model/homeSchemas';
import type { HomeSectionListItem } from '../../model/home.types';
import { HeroFields } from '../fields/HeroFields';
import { SectionFormShell } from './SectionFormShell';

interface HeroSectionFormProps {
  section: HomeSectionListItem;
  onClose: () => void;
}

export function HeroSectionForm({ section, onClose }: HeroSectionFormProps) {
  const mutation = useUpdateHomeSection(section.id);
  const [title, setTitle] = useState(section.title);
  const [isVisible, setIsVisible] = useState(section.isVisible);
  const [titleError, setTitleError] = useState<string | null>(null);

  // configJson 안전 파싱 — 손상된 데이터는 기본값으로 복원
  const initialConfig =
    heroConfigSchema.safeParse(section.configJson).data ??
    defaultConfigByType.HERO;

  const form = useForm<HeroConfigData>({
    resolver: zodResolver(heroConfigSchema),
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
      <HeroFields
        register={form.register}
        control={form.control}
        errors={form.formState.errors}
        setValue={form.setValue}
      />
    </SectionFormShell>
  );
}
