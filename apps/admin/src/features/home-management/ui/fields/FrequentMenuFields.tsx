'use client';

import type {
  Control,
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
} from 'react-hook-form';
import { Controller, useFieldArray, useWatch } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';

import { ImageUrlInput } from '@/entities/media/ui/ImageUrlInput';
import { linkTargetReferencesOptions } from '@/entities/link-target/api/linkTargetReferencesQueries';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/shadcn/input';
import { Label } from '@/shared/ui/shadcn/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/shared/ui/Select';
import { BooleanSwitchField } from '@/shared/ui/BooleanSwitchField';

import type { FrequentMenuConfigData } from '../../model/homeSchemas';

interface FrequentMenuFieldsProps {
  register: UseFormRegister<FrequentMenuConfigData>;
  control: Control<FrequentMenuConfigData>;
  setValue: UseFormSetValue<FrequentMenuConfigData>;
  errors: FieldErrors<FrequentMenuConfigData>;
}

export function FrequentMenuFields({
  register,
  control,
  setValue,
  errors,
}: FrequentMenuFieldsProps) {
  const { data: references } = useQuery(linkTargetReferencesOptions());
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const handleAppend = () => {
    append({
      title: '',
      itemType: 'SUBPAGE',
      subpageId: null,
      boardId: null,
      url: null,
      isVisible: true,
      openInNewTab: false,
      iconUrl: '',
      iconAlt: '',
      iconMediaId: null,
      iconOriginalName: null,
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="heading">섹션 제목 *</Label>
        <Input
          id="heading"
          {...register('heading')}
          placeholder="예: 자주찾는 메뉴"
        />
        {errors.heading && (
          <p className="text-sm text-destructive">{errors.heading.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <Label>메뉴 항목</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              최대 6개까지 등록할 수 있습니다. 시작일/종료일은 사용하지
              않습니다.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={fields.length >= 6}
            onClick={handleAppend}
          >
            <Plus className="size-4" />
            추가
          </Button>
        </div>

        {fields.length === 0 ? (
          <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
            자주찾는 메뉴 항목이 없습니다.
          </p>
        ) : (
          <div className="space-y-3">
            {fields.map((field, index) => (
              <FrequentMenuItemFields
                key={field.id}
                index={index}
                control={control}
                register={register}
                setValue={setValue}
                errors={errors}
                subpages={references?.subpages ?? []}
                boards={references?.boards ?? []}
                onRemove={() => remove(index)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface FrequentMenuItemFieldsProps {
  index: number;
  control: Control<FrequentMenuConfigData>;
  register: UseFormRegister<FrequentMenuConfigData>;
  setValue: UseFormSetValue<FrequentMenuConfigData>;
  errors: FieldErrors<FrequentMenuConfigData>;
  subpages: Array<{ id: string; title: string }>;
  boards: Array<{ id: string; name: string }>;
  onRemove: () => void;
}

function FrequentMenuItemFields({
  index,
  control,
  register,
  setValue,
  errors,
  subpages,
  boards,
  onRemove,
}: FrequentMenuItemFieldsProps) {
  const itemType = useWatch({ control, name: `items.${index}.itemType` });
  const title = useWatch({ control, name: `items.${index}.title` });
  const iconOriginalName = useWatch({
    control,
    name: `items.${index}.iconOriginalName`,
  });
  const iconMediaId = useWatch({ control, name: `items.${index}.iconMediaId` });

  const handleSubpageChange = (subpageId: string) => {
    setValue(`items.${index}.subpageId`, subpageId, { shouldDirty: true });
    setValue(`items.${index}.boardId`, null, { shouldDirty: true });
    setValue(`items.${index}.url`, null, { shouldDirty: true });
    const subpage = subpages.find((item) => item.id === subpageId);
    if (subpage && !title) {
      setValue(`items.${index}.title`, subpage.title, { shouldDirty: true });
      setValue(`items.${index}.iconAlt`, `${subpage.title} 아이콘`, {
        shouldDirty: true,
      });
    }
  };

  const handleBoardChange = (boardId: string) => {
    setValue(`items.${index}.boardId`, boardId, { shouldDirty: true });
    setValue(`items.${index}.subpageId`, null, { shouldDirty: true });
    setValue(`items.${index}.url`, null, { shouldDirty: true });
    const board = boards.find((item) => item.id === boardId);
    if (board && !title) {
      setValue(`items.${index}.title`, board.name, { shouldDirty: true });
      setValue(`items.${index}.iconAlt`, `${board.name} 아이콘`, {
        shouldDirty: true,
      });
    }
  };

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">항목 {index + 1}</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          title="제거"
        >
          <Trash2 className="size-4 text-destructive" />
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">항목 타입</Label>
          <Controller
            control={control}
            name={`items.${index}.itemType`}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value);
                  setValue(`items.${index}.subpageId`, null, {
                    shouldDirty: true,
                  });
                  setValue(`items.${index}.boardId`, null, {
                    shouldDirty: true,
                  });
                  setValue(`items.${index}.url`, null, { shouldDirty: true });
                }}
              >
                <SelectTrigger>
                  <span>
                    {field.value === 'SUBPAGE' && '서브 페이지'}
                    {field.value === 'BOARD' && '게시판'}
                    {field.value === 'EXTERNAL' && '외부 링크'}
                    {field.value === 'CUSTOM' && '커스텀 경로'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SUBPAGE">서브 페이지</SelectItem>
                  <SelectItem value="BOARD">게시판</SelectItem>
                  <SelectItem value="EXTERNAL">외부 링크</SelectItem>
                  <SelectItem value="CUSTOM">커스텀 경로</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">제목 *</Label>
          <Input
            {...register(`items.${index}.title`)}
            placeholder="예: 사업자등록 증명"
          />
          {errors.items?.[index]?.title && (
            <p className="text-xs text-destructive">
              {errors.items[index]?.title?.message}
            </p>
          )}
        </div>
      </div>

      {itemType === 'SUBPAGE' && (
        <div className="space-y-1">
          <Label className="text-xs">서브 페이지</Label>
          <Controller
            control={control}
            name={`items.${index}.subpageId`}
            render={({ field }) => (
              <Select
                value={field.value ?? ''}
                onValueChange={(value) => handleSubpageChange(value ?? '')}
              >
                <SelectTrigger>
                  <span>
                    {subpages.find((item) => item.id === field.value)?.title ??
                      '선택'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {subpages.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      )}

      {itemType === 'BOARD' && (
        <div className="space-y-1">
          <Label className="text-xs">게시판</Label>
          <Controller
            control={control}
            name={`items.${index}.boardId`}
            render={({ field }) => (
              <Select
                value={field.value ?? ''}
                onValueChange={(value) => handleBoardChange(value ?? '')}
              >
                <SelectTrigger>
                  <span>
                    {boards.find((item) => item.id === field.value)?.name ??
                      '선택'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {boards.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      )}

      {(itemType === 'EXTERNAL' || itemType === 'CUSTOM') && (
        <div className="space-y-1">
          <Label className="text-xs">
            {itemType === 'EXTERNAL' ? 'URL' : '경로'}
          </Label>
          <Input
            {...register(`items.${index}.url`)}
            placeholder={
              itemType === 'EXTERNAL' ? 'https://example.com' : '/search'
            }
          />
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <BooleanSwitchField
          control={control}
          name={`items.${index}.isVisible`}
          label="공개"
        />
        <BooleanSwitchField
          control={control}
          name={`items.${index}.openInNewTab`}
          label="새 탭에서 열기"
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs">아이콘 이미지 *</Label>
        <Controller
          control={control}
          name={`items.${index}.iconUrl`}
          render={({ field }) => (
            <ImageUrlInput
              value={field.value ?? ''}
              originalName={iconOriginalName ?? null}
              mediaId={iconMediaId ?? null}
              category="home"
              placeholder="URL 입력 또는 [업로드/라이브러리]로 선택"
              onChange={(next) => {
                setValue(`items.${index}.iconUrl`, next.url, {
                  shouldDirty: true,
                });
                setValue(`items.${index}.iconMediaId`, next.mediaId, {
                  shouldDirty: true,
                });
                setValue(`items.${index}.iconOriginalName`, next.originalName, {
                  shouldDirty: true,
                });
                if (next.url && !title) {
                  setValue(`items.${index}.iconAlt`, '자주찾는 메뉴 아이콘', {
                    shouldDirty: true,
                  });
                }
              }}
            />
          )}
        />
        {errors.items?.[index]?.iconUrl && (
          <p className="text-xs text-destructive">
            {errors.items[index]?.iconUrl?.message}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <Label className="text-xs">아이콘 대체 텍스트 *</Label>
        <Input
          {...register(`items.${index}.iconAlt`)}
          placeholder="예: 사업자등록 증명 아이콘"
        />
        {errors.items?.[index]?.iconAlt && (
          <p className="text-xs text-destructive">
            {errors.items[index]?.iconAlt?.message}
          </p>
        )}
      </div>
    </div>
  );
}
