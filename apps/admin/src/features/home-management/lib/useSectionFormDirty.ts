'use client';

import { useEffect } from 'react';
import type { FieldValues, UseFormReturn } from 'react-hook-form';

interface SectionDirtySource {
  title: string;
  isVisible: boolean;
}

interface UseSectionFormDirtyOptions<T extends FieldValues> {
  form: UseFormReturn<T>;
  title: string;
  isVisible: boolean;
  section: SectionDirtySource;
  mutationPending: boolean;
  mutationSuccess: boolean;
  onDirtyChange?: (dirty: boolean) => void;
}

/**
 * 메인 섹션 편집 폼의 dirty 상태를 부모(SectionEditDialog)로 전파.
 * `formState.isDirty`(configJson) + `title` + `isVisible` 변경을 종합.
 *
 * mutation pending/success 시 false로 강제 — 저장 직후 onClose 호출 시
 * 부모의 useDialogDirtyGuard가 잘못된 confirm dialog를 띄우지 않도록.
 */
export function useSectionFormDirty<T extends FieldValues>({
  form,
  title,
  isVisible,
  section,
  mutationPending,
  mutationSuccess,
  onDirtyChange,
}: UseSectionFormDirtyOptions<T>) {
  const isFormDirty = form.formState.isDirty;
  const isDirty =
    !mutationPending &&
    !mutationSuccess &&
    (isFormDirty ||
      title !== section.title ||
      isVisible !== section.isVisible);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);
}
