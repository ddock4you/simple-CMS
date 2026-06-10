'use client';

import type {
  Control,
  FieldPath,
  FieldValues,
  UseFormRegister,
} from 'react-hook-form';
import { Controller, useWatch } from 'react-hook-form';

import { Checkbox } from '@/shared/ui/shadcn/checkbox';
import { Input } from '@/shared/ui/shadcn/input';
import { Label } from '@/shared/ui/shadcn/label';

/**
 * 슬라이드 옵션 공통 패널 (HERO에서 사용).
 *
 * react-hook-form 제네릭으로 폼 내 어느 경로(`slideOptions`)에 중첩되어도 사용 가능.
 * 각 필드명은 항상 `slideOptions.{field}` 형태로 구성되므로,
 * 루트 경로를 prefix로 받아서 조합한다.
 */
interface SlideOptionsPanelProps<T extends FieldValues> {
  control: Control<T>;
  register: UseFormRegister<T>;
  /** slideOptions 객체의 루트 경로 (예: 'slideOptions') */
  basePath: FieldPath<T>;
}

export function SlideOptionsPanel<T extends FieldValues>({
  control,
  register,
  basePath,
}: SlideOptionsPanelProps<T>) {
  const showPlayPausePath = `${basePath}.showPlayPause` as FieldPath<T>;
  const showPlayPause = useWatch({
    control,
    name: showPlayPausePath,
  }) as boolean | undefined;

  return (
    <fieldset className="space-y-4 rounded-md border p-4">
      <legend className="px-1 text-sm font-medium">슬라이드 옵션</legend>

      <div className="grid gap-3 sm:grid-cols-3">
        <Controller
          control={control}
          name={`${basePath}.showPrevNext` as FieldPath<T>}
          render={({ field }) => (
            <label className="flex cursor-pointer items-center gap-2">
              <Checkbox
                checked={field.value === true}
                onCheckedChange={(v) => field.onChange(v === true)}
              />
              <span className="text-sm">이전/다음 버튼</span>
            </label>
          )}
        />
        <Controller
          control={control}
          name={`${basePath}.showDots` as FieldPath<T>}
          render={({ field }) => (
            <label className="flex cursor-pointer items-center gap-2">
              <Checkbox
                checked={field.value === true}
                onCheckedChange={(v) => field.onChange(v === true)}
              />
              <span className="text-sm">도트 인디케이터</span>
            </label>
          )}
        />
        <Controller
          control={control}
          name={showPlayPausePath}
          render={({ field }) => (
            <label className="flex cursor-pointer items-center gap-2">
              <Checkbox
                checked={field.value === true}
                onCheckedChange={(v) => field.onChange(v === true)}
              />
              <span className="text-sm">재생/정지 버튼</span>
            </label>
          )}
        />
      </div>

      {showPlayPause && (
        <div className="space-y-3 rounded-md border border-dashed p-3">
          <p className="text-xs text-muted-foreground">
            재생/정지 버튼이 활성화된 경우에만 적용되는 자동재생 옵션입니다.
          </p>
          <Controller
            control={control}
            name={`${basePath}.autoPlay` as FieldPath<T>}
            render={({ field }) => (
              <label className="flex cursor-pointer items-center gap-2">
                <Checkbox
                  checked={field.value === true}
                  onCheckedChange={(v) => field.onChange(v === true)}
                />
                <span className="text-sm">페이지 로드 시 자동재생 시작</span>
              </label>
            )}
          />
          <div className="space-y-1">
            <Label
              htmlFor={`${basePath}-autoPlayInterval`}
              className="text-xs"
            >
              자동재생 전환 간격 (ms)
            </Label>
            <Input
              id={`${basePath}-autoPlayInterval`}
              type="number"
              min={1000}
              max={30000}
              step={500}
              {...register(`${basePath}.autoPlayInterval` as FieldPath<T>, {
                valueAsNumber: true,
              })}
            />
            <p className="text-xs text-muted-foreground">
              1,000 ~ 30,000 (예: 5000 = 5초마다 전환)
            </p>
          </div>
        </div>
      )}
    </fieldset>
  );
}
