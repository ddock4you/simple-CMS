'use client';

import { useState } from 'react';

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

import { useBulkDeletePosts } from '../api/usePostMutations';
import type { BulkDeletePostResponse } from '../api/postFetchers';

interface Props {
  ids: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted?: (result: BulkDeletePostResponse) => void;
}

type Phase =
  | { kind: 'confirm' }
  | { kind: 'result'; result: BulkDeletePostResponse };

export function BulkDeletePostDialog({
  ids,
  open,
  onOpenChange,
  onCompleted,
}: Props) {
  const [phase, setPhase] = useState<Phase>({ kind: 'confirm' });

  const bulkDelete = useBulkDeletePosts({
    onSuccess: (result) => {
      if (result.blocked.length > 0) {
        setPhase({ kind: 'result', result });
      } else {
        onOpenChange(false);
        onCompleted?.(result);
        setPhase({ kind: 'confirm' });
      }
    },
  });

  const handleClose = () => {
    onOpenChange(false);
    if (phase.kind === 'result') onCompleted?.(phase.result);
    setTimeout(() => setPhase({ kind: 'confirm' }), 100);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) handleClose();
    else onOpenChange(next);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-xl">
        {phase.kind === 'confirm' ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>게시글 일괄 삭제</AlertDialogTitle>
              <AlertDialogDescription>
                선택한 {ids.length}개 게시글을 삭제하시겠습니까?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={bulkDelete.isPending}>취소</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => bulkDelete.mutate(ids)}
                disabled={bulkDelete.isPending || ids.length === 0}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {bulkDelete.isPending ? '삭제 중...' : `${ids.length}개 삭제`}
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>일괄 삭제 결과</AlertDialogTitle>
              <AlertDialogDescription>
                {phase.result.deleted.length}개 삭제,{' '}
                {phase.result.blocked.length}개 실패
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-3">
              <p className="text-sm font-medium">실패한 게시글</p>
              <ul className="max-h-80 space-y-2 overflow-y-auto rounded-md border bg-muted/30 p-2 text-sm">
                {phase.result.blocked.map((item) => (
                  <li key={item.id} className="space-y-1 border-b pb-2 last:border-b-0 last:pb-0">
                    <p className="font-medium">{item.title}</p>
                    <p className="pl-3 text-xs text-muted-foreground">· {item.reason}</p>
                  </li>
                ))}
              </ul>
            </div>

            <AlertDialogFooter>
              <AlertDialogAction onClick={handleClose}>확인</AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
