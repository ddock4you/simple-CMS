'use client';

import { Loader2, RotateCcw, Save } from 'lucide-react';

import { Button } from '@/shared/ui/shadcn/button';

interface OrderActionButtonsProps {
  dirtyCount: number;
  isSaving: boolean;
  onReset: () => void;
  onSave: () => void;
  /** 저장 버튼 레이블 (기본값: '순서 저장'). */
  label?: string;
}

/**
 * DnD staged save 패턴용 헤더 인라인 버튼 쌍.
 *
 * 배치: 헤더 우측 끝 (`ml-auto flex gap-2`)에 [생성] 버튼과 같은 행에 결합.
 * dirty 아닐 때 두 버튼 모두 disabled. 저장 중엔 [순서 저장]에 Spinner + aria-busy.
 */
export function OrderActionButtons({
  dirtyCount,
  isSaving,
  onReset,
  onSave,
  label = '순서 저장',
}: OrderActionButtonsProps) {
  const isDirty = dirtyCount > 0;

  return (
    <div className="flex items-center gap-2">
      {isDirty && (
        <span className="text-xs text-muted-foreground" aria-live="polite">
          {dirtyCount}개 변경됨
        </span>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!isDirty || isSaving}
        onClick={onReset}
      >
        <RotateCcw className="size-3.5" />
        되돌리기
      </Button>
      <Button
        type="button"
        size="sm"
        disabled={!isDirty || isSaving}
        aria-busy={isSaving}
        onClick={onSave}
      >
        {isSaving ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Save className="size-3.5" />
        )}
        {label}
      </Button>
    </div>
  );
}
