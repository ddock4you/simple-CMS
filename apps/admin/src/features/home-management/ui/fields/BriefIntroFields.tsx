'use client';

import type {
  Control,
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
} from 'react-hook-form';
import { Controller, useWatch } from 'react-hook-form';

<<<<<<< HEAD
=======
import { LinkTargetInput } from '@/entities/link-target/ui/LinkTargetInput';
import { ImageUrlInput } from '@/entities/media/ui/ImageUrlInput';
>>>>>>> feature/gallery-collection-home-section
import { Checkbox } from '@/shared/ui/shadcn/checkbox';
import { Input } from '@/shared/ui/shadcn/input';
import { Label } from '@/shared/ui/shadcn/label';
import { Textarea } from '@/shared/ui/shadcn/textarea';
<<<<<<< HEAD
import { LinkTargetInput } from '@/entities/link-target/ui/LinkTargetInput';
import { ImageUrlInput } from '@/entities/media/ui/ImageUrlInput';
=======
>>>>>>> feature/gallery-collection-home-section

import type { BriefIntroConfigData } from '../../model/homeSchemas';

interface BriefIntroFieldsProps {
  register: UseFormRegister<BriefIntroConfigData>;
  control: Control<BriefIntroConfigData>;
  errors: FieldErrors<BriefIntroConfigData>;
  setValue: UseFormSetValue<BriefIntroConfigData>;
}

export function BriefIntroFields({
  register,
  control,
  errors,
  setValue,
}: BriefIntroFieldsProps) {
  const detailEnabled = useWatch({ control, name: 'detailEnabled' });
  const imageUrl = useWatch({ control, name: 'imageUrl' });
  const imageOriginalName = useWatch({ control, name: 'imageOriginalName' });
  const mediaId = useWatch({ control, name: 'mediaId' });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="brief-heading">제목 *</Label>
        <Textarea
          id="brief-heading"
          {...register('heading')}
          placeholder={'예: 안녕하십니까.\n방문자 여러분을 환영합니다.'}
          rows={2}
        />
        {errors.heading && (
          <p className="text-sm text-destructive">{errors.heading.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="brief-content">내용 *</Label>
        <Textarea
          id="brief-content"
          {...register('content')}
          placeholder="간략 소개 문구를 입력해주세요."
          rows={5}
        />
        {errors.content && (
          <p className="text-sm text-destructive">{errors.content.message}</p>
        )}
      </div>

      <div className="space-y-3 rounded-md border p-3">
        <Controller
          control={control}
          name="detailEnabled"
          render={({ field }) => (
            <div className="flex items-center gap-2">
              <Checkbox
                id="brief-detail-enabled"
                checked={field.value}
                onCheckedChange={(checked) => {
                  field.onChange(checked === true);
                  if (checked !== true) {
                    setValue('detailUrl', null, { shouldDirty: true });
                  }
                }}
              />
              <Label htmlFor="brief-detail-enabled" className="cursor-pointer">
                자세히 보기 사용
              </Label>
            </div>
          )}
        />

        {detailEnabled ? (
          <Controller
            control={control}
            name="detailUrl"
            render={({ field }) => (
              <LinkTargetInput
                value={field.value ?? ''}
                onChange={field.onChange}
                label="자세히 보기 URL *"
                id="brief-detail-url"
                allowNone={false}
              />
            )}
          />
        ) : (
          <div className="space-y-2">
            <Label htmlFor="brief-detail-url-disabled">자세히 보기 URL</Label>
            <Input
              id="brief-detail-url-disabled"
              disabled
              placeholder="자세히 보기 사용 시 입력할 수 있습니다."
            />
          </div>
        )}
        {errors.detailUrl && (
          <p className="text-sm text-destructive">{errors.detailUrl.message}</p>
        )}
      </div>

      <div className="space-y-3 rounded-md border p-3">
        <div className="space-y-1">
          <Label>이미지 (선택)</Label>
          <p className="text-xs text-muted-foreground">
            이미지를 선택하지 않으면 공개 웹에서 이미지 영역 없이 표시됩니다.
          </p>
        </div>
        <Controller
          control={control}
          name="imageUrl"
          render={({ field }) => (
            <ImageUrlInput
              value={field.value ?? ''}
              originalName={imageOriginalName ?? null}
              mediaId={mediaId ?? null}
              onChange={(next) => {
                setValue('imageUrl', next.url || null, { shouldDirty: true });
                setValue('imageOriginalName', next.originalName, {
                  shouldDirty: true,
                });
                setValue('mediaId', next.mediaId, { shouldDirty: true });
                if (!next.url) {
                  setValue('imageAlt', null, { shouldDirty: true });
                }
              }}
              category="home"
              placeholder="URL 입력 또는 [업로드/라이브러리]로 선택"
            />
          )}
        />
        {errors.imageUrl && (
          <p className="text-sm text-destructive">{errors.imageUrl.message}</p>
        )}

        {imageUrl?.trim() && (
          <div className="space-y-2">
            <Label htmlFor="brief-image-alt">이미지 대체 텍스트 *</Label>
            <Input
              id="brief-image-alt"
              {...register('imageAlt')}
              placeholder="스크린 리더용 이미지 설명"
            />
            {errors.imageAlt && (
              <p className="text-sm text-destructive">
                {errors.imageAlt.message}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
