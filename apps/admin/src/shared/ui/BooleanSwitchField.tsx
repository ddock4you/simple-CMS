'use client';

import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { Controller } from 'react-hook-form';

import { Switch } from '@/shared/ui/shadcn/switch';

interface BooleanSwitchFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  description?: string;
  disabled?: boolean;
}

export function BooleanSwitchField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  disabled,
}: BooleanSwitchFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <label className="flex cursor-pointer items-start gap-3">
          <Switch
            checked={!!field.value}
            onCheckedChange={field.onChange}
            disabled={disabled ?? field.disabled}
            className="mt-0.5"
          />
          <span className="space-y-0.5">
            <span className="block text-sm font-medium leading-none">
              {label}
            </span>
            {description && (
              <span className="block text-xs text-muted-foreground">
                {description}
              </span>
            )}
            {fieldState.error && (
              <span className="block text-xs text-destructive">
                {fieldState.error.message}
              </span>
            )}
          </span>
        </label>
      )}
    />
  );
}
