'use client';

import { useState } from 'react';
import { useForm, Controller, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Control, UseFormSetValue } from 'react-hook-form';
import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/shadcn/input';
import { Label } from '@/shared/ui/shadcn/label';
import { Textarea } from '@/shared/ui/shadcn/textarea';
import { ImageUrlInput } from '@/entities/media/ui/ImageUrlInput';
import { LinkTargetInput } from '@/entities/link-target/ui/LinkTargetInput';

import { useUpdateHomeSection } from '../../api/useHomeMutations';
import { useSectionFormDirty } from '../../lib/useSectionFormDirty';
import {
  defaultConfigByType,
  subCarouselConfigSchema,
  type SubCarouselConfigData,
} from '../../model/homeSchemas';
import type { HomeSectionListItem } from '../../model/home.types';
import { SlideOptionsPanel } from '../fields/SlideOptionsPanel';
import { SectionFormShell } from './SectionFormShell';

interface SubCarouselSectionFormProps {
  section: HomeSectionListItem;
  onClose: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

export function SubCarouselSectionForm({
  section,
  onClose,
  onDirtyChange,
}: SubCarouselSectionFormProps) {
  const mutation = useUpdateHomeSection(section.id);
  const [title, setTitle] = useState(section.title);
  const [isVisible, setIsVisible] = useState(section.isVisible);
  const [titleError, setTitleError] = useState<string | null>(null);

  const initialConfig =
    subCarouselConfigSchema.safeParse(section.configJson).data ??
    defaultConfigByType.SUB_CAROUSEL;

  const form = useForm<SubCarouselConfigData>({
    resolver: zodResolver(subCarouselConfigSchema),
    defaultValues: initialConfig,
  });

  useSectionFormDirty({
    form,
    title,
    isVisible,
    section,
    mutationPending: mutation.isPending,
    mutationSuccess: mutation.isSuccess,
    onDirtyChange,
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

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: 'items',
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
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="tagline">태그라인 (선택)</Label>
          <Input
            id="tagline"
            {...form.register('tagline')}
            placeholder="예: Closer to Nature, Closer to You"
          />
          <p className="text-xs text-muted-foreground">
            영문 소제목 (섹션 최상단에 작게 표시)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="mainHeading">메인 제목 *</Label>
          <Textarea
            id="mainHeading"
            {...form.register('mainHeading')}
            placeholder={'예: 비가 오나 눈이 오나 찾아갈 수 있는\n우리 곁의 가장 가까운 식물원'}
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            줄바꿈을 포함할 수 있습니다. (Enter = 실제 줄바꿈)
          </p>
          {form.formState.errors.mainHeading && (
            <p className="text-sm text-destructive">
              {form.formState.errors.mainHeading.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="subHeading">서브 제목 (선택)</Label>
          <Input
            id="subHeading"
            {...form.register('subHeading')}
            placeholder="예: 지금 계절에 만날 수 있는 식물"
          />
          <p className="text-xs text-muted-foreground">
            형광펜 배경 강조 텍스트로 표시됩니다.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">설명 (선택)</Label>
          <Textarea
            id="description"
            {...form.register('description')}
            placeholder="섹션에 대한 부가 설명"
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>캐러셀 아이템 (최대 12개)</Label>
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
                  subtitle: null,
                  url: null,
                  imageOriginalName: null,
                  mediaId: null,
                })
              }
            >
              <Plus className="size-4" />
              아이템 추가
            </Button>
          </div>

          {fields.length === 0 ? (
            <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
              아이템이 없습니다. 원형 썸네일 캐러셀에 표시될 식물/콘텐츠를
              추가해주세요.
            </p>
          ) : (
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="space-y-3 rounded-md border p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      아이템 {index + 1}
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
                    <Label className="text-xs">원형 썸네일 이미지 *</Label>
                    <SubCarouselImageField
                      control={form.control}
                      setValue={form.setValue}
                      index={index}
                    />
                    {form.formState.errors.items?.[index]?.imageUrl && (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.items[index]?.imageUrl?.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">이미지 대체 텍스트 (alt) *</Label>
                    <Input
                      {...form.register(`items.${index}.imageAlt`)}
                      placeholder="스크린 리더용 이미지 설명"
                    />
                    {form.formState.errors.items?.[index]?.imageAlt && (
                      <p className="text-xs text-destructive">
                        {
                          form.formState.errors.items[index]?.imageAlt
                            ?.message
                        }
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">이름 *</Label>
                    <Input
                      {...form.register(`items.${index}.title`)}
                      placeholder="예: 수국"
                    />
                    {form.formState.errors.items?.[index]?.title && (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.items[index]?.title?.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">학명/영문 (선택)</Label>
                    <Input
                      {...form.register(`items.${index}.subtitle`)}
                      placeholder="예: Hydrangea macrophylla"
                    />
                    <p className="text-xs text-muted-foreground">
                      학명 또는 영문 부제목 (이름 아래 작은 이탤릭으로 표시)
                    </p>
                  </div>

                  <div className="space-y-1">
                    <Controller
                      control={form.control}
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
                      URL을 입력하면 아이템 전체가 링크로 동작합니다.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {form.formState.errors.items &&
            typeof form.formState.errors.items.message === 'string' && (
              <p className="text-sm text-destructive">
                {form.formState.errors.items.message}
              </p>
            )}
        </div>

        <SlideOptionsPanel
          control={form.control}
          register={form.register}
          basePath="slideOptions"
        />
      </div>
    </SectionFormShell>
  );
}

function SubCarouselImageField({
  control,
  setValue,
  index,
}: {
  control: Control<SubCarouselConfigData>;
  setValue: UseFormSetValue<SubCarouselConfigData>;
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
