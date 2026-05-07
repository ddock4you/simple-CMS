'use client';

import type { ReactNode } from 'react';

import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/shadcn/input';
import { Label } from '@/shared/ui/shadcn/label';
import { Checkbox } from '@/shared/ui/shadcn/checkbox';
import { DialogFooter } from '@/shared/ui/shadcn/dialog';

interface SectionFormShellProps {
  title: string;
  onTitleChange: (title: string) => void;
  isVisible: boolean;
  onIsVisibleChange: (visible: boolean) => void;
  titleError?: string | null;
  isPending: boolean;
  onSubmit: (event: React.FormEvent) => void;
  onCancel: () => void;
  children: ReactNode;
}

export function SectionFormShell({
  title,
  onTitleChange,
  isVisible,
  onIsVisibleChange,
  titleError,
  isPending,
  onSubmit,
  onCancel,
  children,
}: SectionFormShellProps) {
  return (
    <form onSubmit={onSubmit}>
      <div className="space-y-6 py-4">
        <div className="space-y-4 rounded-md border p-3">
          <div className="space-y-2">
            <Label htmlFor="section-title">관리용 제목 *</Label>
            <Input
              id="section-title"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="섹션 관리용 이름"
            />
            {titleError && (
              <p className="text-sm text-destructive">{titleError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              공개 웹에는 표시되지 않습니다. 관리 페이지에서만 사용됩니다.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="section-isVisible"
              checked={isVisible}
              onCheckedChange={(checked) => onIsVisibleChange(checked === true)}
            />
            <Label htmlFor="section-isVisible" className="cursor-pointer">
              공개 웹에 노출
            </Label>
          </div>
        </div>

        {children}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          취소
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? '저장 중...' : '저장'}
        </Button>
      </DialogFooter>
    </form>
  );
}
