'use client';

import { Switch } from '@/shared/ui/shadcn/switch';

interface InlineBooleanToggleProps {
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  isPending?: boolean;
  labelOn?: string;
  labelOff?: string;
}

/**
 * 목록 셀 안에서 boolean 상태(공개/비공개, 노출/숨김 등)를 인라인 토글.
 */
export function InlineBooleanToggle({
  value,
  onChange,
  disabled,
  isPending,
  labelOn = '공개',
  labelOff = '비공개',
}: InlineBooleanToggleProps) {
  return (
    <label className="inline-flex items-center gap-2">
      <Switch
        checked={value}
        onCheckedChange={onChange}
        disabled={disabled || isPending}
      />
      <span className="text-xs text-muted-foreground">
        {isPending ? '변경 중...' : value ? labelOn : labelOff}
      </span>
    </label>
  );
}
