'use client';

import { Controller } from 'react-hook-form';
import type { UseFormReturn } from 'react-hook-form';

import { Input } from '@/shared/ui/shadcn/input';
import { Label } from '@/shared/ui/shadcn/label';
import { ImageUrlInput } from '@/entities/media/ui/ImageUrlInput';

import type { PopupFormValues } from '../model/popupSchemas';

import { LinkTargetInput } from './LinkTargetInput';

export function PopupImageFields({
  form,
}: {
  form: UseFormReturn<PopupFormValues>;
}) {
  const {
    register,
    control,
    watch,
    setValue,
    formState: { errors },
  } = form;

  const mediaId = watch('imageMediaId') ?? null;

  return (
    <>
      <div className="space-y-2">
        <Label>이미지 *</Label>
        <Controller
          name="imageUrl"
          control={control}
          render={({ field }) => (
            <ImageUrlInput
              value={field.value ?? ''}
              mediaId={mediaId}
              onChange={(next) => {
                setValue('imageUrl', next.url, { shouldDirty: true });
                setValue('imageMediaId', next.mediaId, { shouldDirty: true });
              }}
              category="popup"
              placeholder="URL 입력 또는 [업로드/라이브러리] 선택"
            />
          )}
        />
        {errors.imageUrl && (
          <p className="text-sm text-destructive">
            {errors.imageUrl.message as string}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="imageAlt">대체 텍스트 (alt) *</Label>
        <Input
          id="imageAlt"
          {...register('imageAlt')}
          placeholder="이미지 설명 — 스크린리더/접근성"
        />
        {errors.imageAlt && (
          <p className="text-sm text-destructive">
            {errors.imageAlt.message as string}
          </p>
        )}
      </div>

      <Controller
        name="linkUrl"
        control={control}
        render={({ field }) => (
          <LinkTargetInput
            value={field.value ?? ''}
            onChange={field.onChange}
            label="클릭 시 이동할 링크 (선택)"
            id="linkUrl-image"
          />
        )}
      />
    </>
  );
}
