'use client';

import type {
  Control,
  FieldErrors,
  UseFormRegister,
} from 'react-hook-form';
import { useFieldArray } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';

import { Button } from '@/shared/ui/shadcn/button';
import { Input } from '@/shared/ui/shadcn/input';
import { Label } from '@/shared/ui/shadcn/label';
import { Textarea } from '@/shared/ui/shadcn/textarea';

import type { ShortcutConfigData } from '../../model/homeSchemas';

interface ShortcutFieldsProps {
  register: UseFormRegister<ShortcutConfigData>;
  control: Control<ShortcutConfigData>;
  errors: FieldErrors<ShortcutConfigData>;
}

export function ShortcutFields({
  register,
  control,
  errors,
}: ShortcutFieldsProps) {
  const { fields, append, remove } = useFieldArray({
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
          placeholder="예: 자주 찾는 서비스"
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
          <Label>바로가기 (최대 8개)</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={fields.length >= 8}
            onClick={() =>
              append({ label: '', description: null, url: '' })
            }
          >
            <Plus className="size-4" />
            추가
          </Button>
        </div>

        {fields.length === 0 ? (
          <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
            바로가기 항목이 없습니다.
          </p>
        ) : (
          <div className="space-y-3">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="space-y-2 rounded-md border p-3"
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 space-y-2">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-xs">라벨 *</Label>
                        <Input
                          {...register(`items.${index}.label`)}
                          placeholder="예: 공지사항"
                        />
                        {errors.items?.[index]?.label && (
                          <p className="text-xs text-destructive">
                            {errors.items[index]?.label?.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">URL *</Label>
                        <Input
                          {...register(`items.${index}.url`)}
                          placeholder="/notice 또는 https://..."
                        />
                        {errors.items?.[index]?.url && (
                          <p className="text-xs text-destructive">
                            {errors.items[index]?.url?.message}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">설명 (선택)</Label>
                      <Input
                        {...register(`items.${index}.description`)}
                        placeholder="간단한 설명"
                      />
                    </div>
                  </div>
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
