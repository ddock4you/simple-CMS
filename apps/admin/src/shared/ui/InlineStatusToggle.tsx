'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/shared/ui/shadcn/select';

interface InlineStatusToggleOption<T extends string> {
  value: T;
  label: string;
}

interface InlineStatusToggleProps<T extends string> {
  value: T;
  options: ReadonlyArray<InlineStatusToggleOption<T>>;
  onChange: (next: T) => void;
  disabled?: boolean;
  isPending?: boolean;
}

/**
 * 목록 셀 안에서 enum 상태(예: DRAFT/PUBLISHED)를 인라인으로 변경하는 Select.
 */
export function InlineStatusToggle<T extends string>({
  value,
  options,
  onChange,
  disabled,
  isPending,
}: InlineStatusToggleProps<T>) {
  const current = options.find((o) => o.value === value);
  return (
    <Select
      value={value}
      onValueChange={(next) => onChange(next as T)}
      disabled={disabled || isPending}
    >
      <SelectTrigger className="h-8 w-[110px] text-xs">
        <span>{isPending ? '변경 중...' : (current?.label ?? value)}</span>
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
