'use client';

import { useState } from 'react';
import type { ContentStatus } from '@simple-cms/db';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/AlertDialog';
import { Label } from '@/shared/ui/shadcn/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/shared/ui/Select';

import { useBulkUpdatePostStatus } from '../api/usePostMutations';

interface Props {
  ids: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted?: () => void;
}

export function BulkStatusPostDialog({
  ids,
  open,
  onOpenChange,
  onCompleted,
}: Props) {
  const [status, setStatus] = useState<ContentStatus>('PUBLISHED');

  const bulkStatus = useBulkUpdatePostStatus({
    onSuccess: () => {
      onOpenChange(false);
      onCompleted?.();
    },
  });

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !bulkStatus.isPending) onOpenChange(false);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>게시글 일괄 상태 변경</AlertDialogTitle>
          <AlertDialogDescription>
            선택한 {ids.length}개 게시글의 상태를 변경합니다. 이미 같은 상태인 항목은
            무시됩니다.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <Label>변경할 상태</Label>
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as ContentStatus)}
          >
            <SelectTrigger>
              <span>{status === 'PUBLISHED' ? '발행' : '초안'}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DRAFT">초안</SelectItem>
              <SelectItem value="PUBLISHED">발행</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={bulkStatus.isPending}>취소</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => bulkStatus.mutate({ ids, status })}
            disabled={bulkStatus.isPending || ids.length === 0}
          >
            {bulkStatus.isPending ? '처리 중...' : `${ids.length}개 변경`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
