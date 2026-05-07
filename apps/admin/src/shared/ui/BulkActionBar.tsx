'use client';

import { type ReactNode } from 'react';

import { Button } from '@/shared/ui/Button';
import { Checkbox } from '@/shared/ui/shadcn/checkbox';

interface BulkAction {
  key: string;
  label: string;
  icon?: ReactNode;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost';
  disabled?: boolean;
  onClick: () => void;
}

interface BulkActionBarProps {
  selectedCount: number;
  totalOnPage: number;
  isAllOnPageSelected: boolean;
  isIndeterminate: boolean;
  onToggleAll: (next: boolean) => void;
  onClear: () => void;
  actions: BulkAction[];
}

/**
 * 목록 상단 인라인 bar — 선택된 항목 수 표시 + "전체 선택" 체크박스 + 액션 버튼들.
 * 미디어 라이브러리에서 검증된 패턴을 추출.
 */
export function BulkActionBar({
  selectedCount,
  totalOnPage,
  isAllOnPageSelected,
  isIndeterminate,
  onToggleAll,
  onClear,
  actions,
}: BulkActionBarProps) {
  return (
    <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
      <div className="flex items-center gap-3">
        <Checkbox
          checked={isIndeterminate ? 'indeterminate' : isAllOnPageSelected}
          onCheckedChange={(c) => onToggleAll(c === true)}
          aria-label="전체 선택"
        />
        <span className="text-sm">
          {selectedCount > 0
            ? `${selectedCount}개 선택됨 (페이지 ${totalOnPage}개)`
            : `${totalOnPage}개 항목`}
        </span>
        {selectedCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-7 text-xs"
          >
            전체 해제
          </Button>
        )}
      </div>
      {selectedCount > 0 && (
        <div className="flex items-center gap-2">
          {actions.map((action) => (
            <Button
              key={action.key}
              variant={action.variant ?? 'outline'}
              size="sm"
              disabled={action.disabled}
              onClick={action.onClick}
            >
              {action.icon}
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
