'use client';

import type { FieldErrors, UseFormRegister } from 'react-hook-form';

import { Input } from '@/shared/ui/shadcn/input';
import { Label } from '@/shared/ui/shadcn/label';
import { Textarea } from '@/shared/ui/shadcn/textarea';

import type { CtaConfigData } from '../../model/homeSchemas';

interface CtaFieldsProps {
  register: UseFormRegister<CtaConfigData>;
  errors: FieldErrors<CtaConfigData>;
}

export function CtaFields({ register, errors }: CtaFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="heading">섹션 제목 *</Label>
        <Input
          id="heading"
          {...register('heading')}
          placeholder="예: 지금 시작하세요"
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
          placeholder="방문자 행동을 유도하는 짧은 문구"
          rows={2}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="buttonLabel">버튼 라벨 *</Label>
          <Input
            id="buttonLabel"
            {...register('buttonLabel')}
            placeholder="자세히 보기"
          />
          {errors.buttonLabel && (
            <p className="text-sm text-destructive">
              {errors.buttonLabel.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="buttonUrl">버튼 URL *</Label>
          <Input
            id="buttonUrl"
            {...register('buttonUrl')}
            placeholder="/about 또는 https://..."
          />
          {errors.buttonUrl && (
            <p className="text-sm text-destructive">
              {errors.buttonUrl.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
