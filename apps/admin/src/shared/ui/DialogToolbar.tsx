'use client';

import type { ReactNode } from 'react';

import { cn } from '@/shared/lib/utils';

interface DialogToolbarProps {
  /** 좌측 슬롯 — 보조 정보나 secondary action */
  left?: ReactNode;
  /** 우측 슬롯 — 저장, 삭제, 복원 등 주요 액션 */
  right?: ReactNode;
  className?: string;
}

/**
 * Dialog 내부 액션 toolbar.
 * DialogHeader 바로 아래에 배치하고, 긴 Dialog에서는 DialogBody만 스크롤되게 한다.
 */
export function DialogToolbar({ left, right, className }: DialogToolbarProps) {
  if (!left && !right) return null;

  return (
    <div
      data-slot="dialog-toolbar"
      className={cn(
        '-mx-4 flex items-center justify-between gap-2 border-b bg-popover px-4 pb-3',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2">{left}</div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
        {right}
      </div>
    </div>
  );
}
