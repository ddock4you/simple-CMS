'use client';

import { Controller } from 'react-hook-form';
import type { UseFormReturn } from 'react-hook-form';

import { Input } from '@/shared/ui/shadcn/input';
import { Label } from '@/shared/ui/shadcn/label';
import { TiptapEditor } from '@/entities/editor/ui/TiptapEditor';
import { LinkTargetInput } from '@/entities/link-target/ui/LinkTargetInput';

import type { PopupFormValues } from '../model/popupSchemas';

export function PopupContentFields({
  form,
}: {
  form: UseFormReturn<PopupFormValues>;
}) {
  const {
    register,
    control,
    formState: { errors },
  } = form;

  return (
    <>
      <div className="space-y-2">
        <Label>본문 *</Label>
        <Controller
          name="contentJson"
          control={control}
          render={({ field }) => (
            <TiptapEditor
              content={
                (field.value as Record<string, unknown> | null | undefined) ??
                undefined
              }
              onChange={(json) => field.onChange(json)}
            />
          )}
        />
        {errors.contentJson && (
          <p className="text-sm text-destructive">
            {errors.contentJson.message as string}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="buttonLabel">버튼 라벨 (선택)</Label>
        <Input
          id="buttonLabel"
          {...register('buttonLabel')}
          placeholder="예: 자세히 보기"
        />
      </div>

      <Controller
        name="linkUrl"
        control={control}
        render={({ field }) => (
          <LinkTargetInput
            value={field.value ?? ''}
            onChange={field.onChange}
            label="버튼/링크 URL (선택)"
            id="linkUrl-content"
          />
        )}
      />
    </>
  );
}
