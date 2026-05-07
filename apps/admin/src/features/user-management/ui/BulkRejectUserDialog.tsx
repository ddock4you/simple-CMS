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

import { useBulkRejectUsers } from '../api/useUserMutations';
import type { BulkUserDeleteResult } from '../api/userFetchers';

interface Props {
  ids: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted?: (result: BulkUserDeleteResult) => void;
}

type Phase =
  | { kind: 'confirm' }
  | { kind: 'result'; result: BulkUserDeleteResult };

export function BulkRejectUserDialog({ ids, open, onOpenChange, onCompleted }: Props) {
  const [phase, setPhase] = useState<Phase>({ kind: 'confirm' });

  const bulkReject = useBulkRejectUsers({
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
    bulkReject.mutate(ids);
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
              <AlertDialogTitle>가입 일괄 거절</AlertDialogTitle>
              <AlertDialogDescription>
                선택한 {ids.length}명의 가입을 거절하시겠습니까? 대기 상태가 아닌
                사용자는 자동으로 제외되며, 거절된 사용자 레코드는 삭제됩니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={bulkReject.isPending}>취소</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirm}
                disabled={bulkReject.isPending || ids.length === 0}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {bulkReject.isPending ? '처리 중...' : `${ids.length}명 거절`}
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>일괄 거절 결과</AlertDialogTitle>
              <AlertDialogDescription>
                {phase.result.deleted.length}명 거절 완료,{' '}
                {phase.result.blocked.length}명은 처리되지 않았습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-3">
              <p className="text-sm font-medium">처리되지 않은 사용자</p>
              <ul className="max-h-64 space-y-2 overflow-y-auto rounded-md border bg-muted/30 p-2 text-sm">
                {phase.result.blocked.map((item) => (
                  <li key={item.id} className="space-y-0.5 border-b pb-2 last:border-b-0 last:pb-0">
                    <p className="font-medium">{item.username}</p>
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
