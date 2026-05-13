'use client';

import type { ReactNode } from 'react';
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

interface BulkDeleteDialogProps<TResult extends { deleted: string[]; blocked: Array<{ id: string }> }> {
  ids: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted?: (result: TResult) => void;
  title: string;
  confirmDescription: ReactNode;
  blockedListLabel: string;
  resultDescription: (result: TResult) => ReactNode;
  renderBlockedItem: (item: TResult['blocked'][number]) => ReactNode;
  useDeleteHook: (options?: { onSuccess?: (result: TResult) => void }) => {
    mutate: (ids: string[]) => void;
    isPending: boolean;
  };
}

type Phase<TResult> = { kind: 'confirm' } | { kind: 'result'; result: TResult };

export function BulkDeleteDialog<TResult extends { deleted: string[]; blocked: Array<{ id: string }> }>({
  ids,
  open,
  onOpenChange,
  onCompleted,
  title,
  confirmDescription,
  blockedListLabel,
  resultDescription,
  renderBlockedItem,
  useDeleteHook,
}: BulkDeleteDialogProps<TResult>) {
  const [phase, setPhase] = useState<Phase<TResult>>({ kind: 'confirm' });

  const bulkDelete = useDeleteHook({
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
      <AlertDialogContent size="wide">
        {phase.kind === 'confirm' ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>{title}</AlertDialogTitle>
              <AlertDialogDescription>{confirmDescription}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={bulkDelete.isPending}>취소</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (ids.length === 0) return;
                  bulkDelete.mutate(ids);
                }}
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
              <AlertDialogDescription>{resultDescription(phase.result)}</AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-3">
              <p className="text-sm font-medium">{blockedListLabel}</p>
              <ul className="max-h-80 space-y-2 overflow-y-auto rounded-md border bg-muted/30 p-2 text-sm">
                {phase.result.blocked.map((item) => (
                  <li key={item.id} className="space-y-1 border-b pb-2 last:border-b-0 last:pb-0">
                    {renderBlockedItem(item)}
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
