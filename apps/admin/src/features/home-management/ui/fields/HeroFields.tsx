'use client';

import type {
  Control,
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
} from 'react-hook-form';
import { Controller, useFieldArray, useWatch } from 'react-hook-form';
import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

import { Button } from '@/shared/ui/shadcn/button';
import { Input } from '@/shared/ui/shadcn/input';
import { Label } from '@/shared/ui/shadcn/label';
import { Textarea } from '@/shared/ui/shadcn/textarea';

import { ImageUrlInput } from '@/entities/media/ui/ImageUrlInput';

import type { HeroConfigData } from '../../model/homeSchemas';
import { SlideOptionsPanel } from './SlideOptionsPanel';

interface HeroFieldsProps {
  register: UseFormRegister<HeroConfigData>;
  control: Control<HeroConfigData>;
  errors: FieldErrors<HeroConfigData>;
  setValue: UseFormSetValue<HeroConfigData>;
}

export function HeroFields({
  register,
  control,
  errors,
  setValue,
}: HeroFieldsProps) {
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: 'slides',
  });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>슬라이드 (최대 10개)</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={fields.length >= 10}
            onClick={() =>
              append({
                imageUrl: '',
                imageAlt: '',
                title: '',
                description: null,
                url: null,
                imageOriginalName: null,
                mediaId: null,
              })
            }
          >
            <Plus className="size-4" />
            슬라이드 추가
          </Button>
        </div>

        {fields.length === 0 ? (
          <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
            슬라이드가 없습니다. 최소 1개 이상 추가해주세요. (2개 이상 등록 시
            자동 슬라이드로 표시됩니다)
          </p>
        ) : (
          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="space-y-3 rounded-md border p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    슬라이드 {index + 1}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={index === 0}
                      onClick={() => move(index, index - 1)}
                      title="위로"
                    >
                      <ArrowUp className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={index === fields.length - 1}
                      onClick={() => move(index, index + 1)}
                      title="아래로"
                    >
                      <ArrowDown className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                      title="제거"
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">이미지 *</Label>
                  <HeroImageField
                    control={control}
                    setValue={setValue}
                    index={index}
                  />
                  {errors.slides?.[index]?.imageUrl && (
                    <p className="text-xs text-destructive">
                      {errors.slides[index]?.imageUrl?.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">
                    이미지 대체 텍스트 (alt) *
                  </Label>
                  <Input
                    {...register(`slides.${index}.imageAlt`)}
                    placeholder="스크린 리더용 이미지 설명"
                  />
                  {errors.slides?.[index]?.imageAlt && (
                    <p className="text-xs text-destructive">
                      {errors.slides[index]?.imageAlt?.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">제목 *</Label>
                  <Input
                    {...register(`slides.${index}.title`)}
                    placeholder="슬라이드 대표 제목"
                  />
                  {errors.slides?.[index]?.title && (
                    <p className="text-xs text-destructive">
                      {errors.slides[index]?.title?.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">설명 (선택)</Label>
                  <Textarea
                    {...register(`slides.${index}.description`)}
                    placeholder="슬라이드 부가 설명"
                    rows={2}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">링크 URL (선택)</Label>
                  <Input
                    {...register(`slides.${index}.url`)}
                    placeholder="/about 또는 https://... (비우면 링크 없음)"
                  />
                  <p className="text-xs text-muted-foreground">
                    URL을 입력하면 슬라이드 전체가 링크로 동작합니다.
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {errors.slides && typeof errors.slides.message === 'string' && (
          <p className="text-sm text-destructive">{errors.slides.message}</p>
        )}
      </div>

      <SlideOptionsPanel
        control={control}
        register={register}
        basePath="slideOptions"
      />
    </div>
  );
}

/**
 * 이미지 URL + 원본 파일명을 동시에 관리하는 서브필드.
 * 두 필드(imageUrl, imageOriginalName)를 연결하여 ImageUrlInput과 react-hook-form 간 동기화.
 */
function HeroImageField({
  control,
  setValue,
  index,
}: {
  control: Control<HeroConfigData>;
  setValue: UseFormSetValue<HeroConfigData>;
  index: number;
}) {
  const originalName = useWatch({
    control,
    name: `slides.${index}.imageOriginalName`,
  }) as string | null | undefined;
  const mediaId = useWatch({
    control,
    name: `slides.${index}.mediaId`,
  }) as string | null | undefined;

  return (
    <Controller
      control={control}
      name={`slides.${index}.imageUrl`}
      render={({ field }) => (
        <ImageUrlInput
          value={field.value ?? ''}
          onChange={field.onChange}
          originalName={originalName ?? null}
          onOriginalNameChange={(name) =>
            setValue(`slides.${index}.imageOriginalName`, name, {
              shouldDirty: true,
            })
          }
          mediaId={mediaId ?? null}
          onMediaIdChange={(id) =>
            setValue(`slides.${index}.mediaId`, id, {
              shouldDirty: true,
            })
          }
          category="home"
          placeholder="URL 입력 또는 [업로드/라이브러리]로 선택"
        />
      )}
    />
  );
}
