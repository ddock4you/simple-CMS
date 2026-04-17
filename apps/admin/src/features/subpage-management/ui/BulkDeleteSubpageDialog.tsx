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
} from '@/shared/ui/shadcn/alert-dialog';

import {
  useBulkDeleteSubpages,
} from '../api/useSubpageMutations';
import type { BulkDeleteSubpageResponse } from '../api/subpageFetchers';

interface Props {
  ids: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted?: (result: BulkDeleteSubpageResponse) => void;
}

type Phase =
  | { kind: 'confirm' }
  | { kind: 'result'; result: BulkDeleteSubpageResponse };

export function BulkDeleteSubpageDialog({
  ids,
  open,
  onOpenChange,
  onCompleted,
}: Props) {
  const [phase, setPhase] = useState<Phase>({ kind: 'confirm' });

  const bulkDelete = useBulkDeleteSubpages({
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

  const handleConfirm = () => {
    if (ids.length === 0) return;
    bulkDelete.mutate(ids);
  };

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
              <AlertDialogTitle>서브 페이지 일괄 삭제</AlertDialogTitle>
              <AlertDialogDescription>
                선택한 {ids.length}개 서브 페이지를 삭제하시겠습니까? 메뉴 항목에서
                참조 중인 서브 페이지는 자동으로 제외됩니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={bulkDelete.isPending}>취소</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirm}
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
                {phase.result.deleted.length}개 삭제 완료,{' '}
                {phase.result.blocked.length}개는 참조 중이라 제외되었습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-3">
              <p className="text-sm font-medium">참조 중인 서브 페이지</p>
              <ul className="max-h-80 space-y-2 overflow-y-auto rounded-md border bg-muted/30 p-2 text-sm">
                {phase.result.blocked.map((item) => (
                  <li
                    key={item.id}
                    className="space-y-1 border-b pb-2 last:border-b-0 last:pb-0"
                  >
                    <p className="font-medium">{item.title}</p>
                    <p className="pl-3 text-xs text-muted-foreground">
                      · {item.reason}
                    </p>
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
