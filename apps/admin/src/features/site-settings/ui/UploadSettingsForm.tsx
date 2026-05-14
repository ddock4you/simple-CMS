'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Upload } from 'lucide-react';

import { Input } from '@/shared/ui/shadcn/input';
import { Label } from '@/shared/ui/shadcn/label';
import { SettingsCardForm } from '@/entities/settings/ui/SettingsCardForm';

import { uploadSettingsOptions } from '../api/settingsQueries';
import { useUpdateUpload } from '../api/useSettingsMutations';
import { updateUploadSchema, type UpdateUploadData } from '../model/settingsSchemas';
import { TagInput } from './TagInput';

export function UploadSettingsForm() {
  const { data } = useQuery(uploadSettingsOptions());
  const updateMutation = useUpdateUpload();

  const form = useForm<UpdateUploadData>({
    resolver: zodResolver(updateUploadSchema),
    defaultValues: {
      allowedExtensions: [],
      allowedMimeTypes: [],
      maxFileSizeMb: 10,
    },
  });

  const { register, control, reset, formState: { errors, isDirty } } = form;

  useEffect(() => {
    if (data) {
      reset({
        allowedExtensions: data.allowedExtensions,
        allowedMimeTypes: data.allowedMimeTypes,
        maxFileSizeMb: data.maxFileSizeMb,
      });
    }
  }, [data, reset]);

  const onSubmit = (formData: UpdateUploadData) => {
    updateMutation.mutate(formData);
  };

  return (
    <SettingsCardForm
      title="업로드 제한 설정"
      icon={Upload}
      form={form}
      onSubmit={onSubmit}
      isPending={updateMutation.isPending}
      disabled={!isDirty}
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <Label>허용 확장자</Label>
          <Controller
            name="allowedExtensions"
            control={control}
            render={({ field }) => (
              <TagInput
                value={field.value}
                onChange={field.onChange}
                placeholder=".jpg, .png, .pdf 형식으로 입력 후 Enter"
              />
            )}
          />
          {errors.allowedExtensions && (
            <p className="text-sm text-destructive">
              {errors.allowedExtensions.message ?? errors.allowedExtensions.root?.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>허용 MIME 타입</Label>
          <Controller
            name="allowedMimeTypes"
            control={control}
            render={({ field }) => (
              <TagInput
                value={field.value}
                onChange={field.onChange}
                placeholder="image/jpeg, application/pdf 형식으로 입력 후 Enter"
              />
            )}
          />
          {errors.allowedMimeTypes && (
            <p className="text-sm text-destructive">
              {errors.allowedMimeTypes.message ?? errors.allowedMimeTypes.root?.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="maxFileSizeMb">최대 파일 크기 (MB)</Label>
          <Input
            id="maxFileSizeMb"
            type="number"
            min={1}
            max={100}
            {...register('maxFileSizeMb', { valueAsNumber: true })}
            className="w-[120px]"
          />
          {errors.maxFileSizeMb && (
            <p className="text-sm text-destructive">{errors.maxFileSizeMb.message}</p>
          )}
        </div>
      </div>
    </SettingsCardForm>
  );
}
