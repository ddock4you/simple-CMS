'use client';

import { Switch } from '@/shared/ui/shadcn/switch';

interface InlineStatusSwitchToggleProps<T extends string> {
  value: T;
  onState: T;
  offState: T;
  onChange: (next: T) => void;
  disabled?: boolean;
  isPending?: boolean;
  labelOn?: string;
  labelOff?: string;
}

/**
 * 목록 셀 안에서 2-option enum 상태(예: DRAFT/PUBLISHED)를 Switch + 라벨로 인라인 토글.
 * InlineBooleanToggle과 동일한 시각 패턴 — status enum 2-option 전용.
 */
export function InlineStatusSwitchToggle<T extends string>({
  value,
  onState,
  offState,
  onChange,
  disabled,
  isPending,
  labelOn = '발행',
  labelOff = '초안',
}: InlineStatusSwitchToggleProps<T>) {
  return (
    <label className="inline-flex items-center gap-2">
      <Switch
        checked={value === onState}
        onCheckedChange={(checked) => onChange(checked ? onState : offState)}
        disabled={disabled || isPending}
      />
      <span className="text-xs text-muted-foreground">
        {isPending ? '변경 중...' : value === onState ? labelOn : labelOff}
      </span>
    </label>
  );
}
