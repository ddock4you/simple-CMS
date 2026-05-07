'use client';

import { useState } from 'react';

import type { BulkDeleteMediaResponse } from '@simple-cms/types';

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

import { useBulkDeleteMedia } from '../api/useMediaMutations';

interface BulkDeleteMediaDialogProps {
  ids: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 모든 처리 후(삭제 + blocked 확인) 호출. 선택 해제 등 호출자 정리용 */
  onCompleted?: (result: BulkDeleteMediaResponse) => void;
}

type Phase =
  | { kind: 'confirm' }
  | { kind: 'result'; result: BulkDeleteMediaResponse };

export function BulkDeleteMediaDialog({
  ids,
  open,
  onOpenChange,
  onCompleted,
}: BulkDeleteMediaDialogProps) {
  const [phase, setPhase] = useState<Phase>({ kind: 'confirm' });

  const bulkDelete = useBulkDeleteMedia({
    onSuccess: (result) => {
      // blocked가 있으면 결과 단계로 전환해서 상세 표시
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
    if (phase.kind === 'result') {
      onCompleted?.(phase.result);
    }
    // 닫힌 후 초기화
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
              <AlertDialogTitle>미디어 일괄 삭제</AlertDialogTitle>
              <AlertDialogDescription>
                선택한 {ids.length}개 미디어를 삭제하시겠습니까? 사용 중인
                미디어는 자동으로 제외됩니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={bulkDelete.isPending}>
                취소
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirm}
                disabled={bulkDelete.isPending || ids.length === 0}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {bulkDelete.isPending
                  ? '삭제 중...'
                  : `${ids.length}개 삭제`}
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>일괄 삭제 결과</AlertDialogTitle>
              <AlertDialogDescription>
                {phase.result.deleted.length}개 삭제 완료,{' '}
                {phase.result.blocked.length}개는 사용 중이라 제외되었습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-3">
              <p className="text-sm font-medium">사용 중인 미디어</p>
              <ul className="max-h-80 space-y-2 overflow-y-auto rounded-md border bg-muted/30 p-2 text-sm">
                {phase.result.blocked.map((item) => (
                  <li key={item.id} className="space-y-1 border-b pb-2 last:border-b-0 last:pb-0">
                    <p className="font-medium">{item.originalFilename}</p>
                    <ul className="pl-3 text-xs text-muted-foreground">
                      {item.references.map((ref) => (
                        <li key={`${ref.type}-${ref.entityId}`}>
                          · {ref.label}
                          {ref.context && (
                            <span className="ml-1">— {ref.context}</span>
                          )}
                        </li>
                      ))}
                    </ul>
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
