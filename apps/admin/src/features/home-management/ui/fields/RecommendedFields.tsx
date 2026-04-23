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
import { LinkTargetInput } from '@/entities/link-target/ui/LinkTargetInput';

import type { RecommendedConfigData } from '../../model/homeSchemas';
import { SlideOptionsPanel } from './SlideOptionsPanel';

interface RecommendedFieldsProps {
  register: UseFormRegister<RecommendedConfigData>;
  control: Control<RecommendedConfigData>;
  errors: FieldErrors<RecommendedConfigData>;
  setValue: UseFormSetValue<RecommendedConfigData>;
}

export function RecommendedFields({
  register,
  control,
  errors,
  setValue,
}: RecommendedFieldsProps) {
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: 'items',
  });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="heading">섹션 제목 *</Label>
        <Input
          id="heading"
          {...register('heading')}
          placeholder="예: 이달의 추천"
        />
        {errors.heading && (
          <p className="text-sm text-destructive">{errors.heading.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">설명 (선택)</Label>
        <Textarea
          id="description"
          {...register('description')}
          placeholder="섹션에 대한 부가 설명"
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>추천 콘텐츠 (최대 12개)</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={fields.length >= 12}
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
            콘텐츠 추가
          </Button>
        </div>

        {fields.length === 0 ? (
          <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
            추천 콘텐츠가 없습니다. 공개 웹 표시 개수(모바일 1 / 태블릿 2 /
            데스크톱 3)를 초과하면 자동으로 슬라이드로 전환됩니다.
          </p>
        ) : (
          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="space-y-3 rounded-md border p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    콘텐츠 {index + 1}
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
                  <Label className="text-xs">대표 이미지 *</Label>
                  <RecommendedImageField
                    control={control}
                    setValue={setValue}
                    index={index}
                  />
                  {errors.items?.[index]?.imageUrl && (
                    <p className="text-xs text-destructive">
                      {errors.items[index]?.imageUrl?.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">
                    이미지 대체 텍스트 (alt) *
                  </Label>
                  <Input
                    {...register(`items.${index}.imageAlt`)}
                    placeholder="스크린 리더용 이미지 설명"
                  />
                  {errors.items?.[index]?.imageAlt && (
                    <p className="text-xs text-destructive">
                      {errors.items[index]?.imageAlt?.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">제목 *</Label>
                  <Input
                    {...register(`items.${index}.title`)}
                    placeholder="콘텐츠 제목"
                  />
                  {errors.items?.[index]?.title && (
                    <p className="text-xs text-destructive">
                      {errors.items[index]?.title?.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">설명 (선택)</Label>
                  <Textarea
                    {...register(`items.${index}.description`)}
                    placeholder="콘텐츠 부가 설명"
                    rows={2}
                  />
                </div>

                <div className="space-y-1">
                  <Controller
                    control={control}
                    name={`items.${index}.url`}
                    render={({ field }) => (
                      <LinkTargetInput
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        label="링크 URL (선택)"
                      />
                    )}
                  />
                  <p className="text-xs text-muted-foreground">
                    URL을 입력하면 카드 전체가 링크로 동작합니다.
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {errors.items && typeof errors.items.message === 'string' && (
          <p className="text-sm text-destructive">{errors.items.message}</p>
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
 */
function RecommendedImageField({
  control,
  setValue,
  index,
}: {
  control: Control<RecommendedConfigData>;
  setValue: UseFormSetValue<RecommendedConfigData>;
  index: number;
}) {
  const originalName = useWatch({
    control,
    name: `items.${index}.imageOriginalName`,
  }) as string | null | undefined;
  const mediaId = useWatch({
    control,
    name: `items.${index}.mediaId`,
  }) as string | null | undefined;

  return (
    <Controller
      control={control}
      name={`items.${index}.imageUrl`}
      render={({ field }) => (
        <ImageUrlInput
          value={field.value ?? ''}
          originalName={originalName ?? null}
          mediaId={mediaId ?? null}
          onChange={(next) => {
            setValue(`items.${index}.imageUrl`, next.url, {
              shouldDirty: true,
            });
            setValue(`items.${index}.imageOriginalName`, next.originalName, {
              shouldDirty: true,
            });
            setValue(`items.${index}.mediaId`, next.mediaId, {
              shouldDirty: true,
            });
          }}
          category="home"
          placeholder="URL 입력 또는 [업로드/라이브러리]로 선택"
        />
      )}
    />
  );
}
