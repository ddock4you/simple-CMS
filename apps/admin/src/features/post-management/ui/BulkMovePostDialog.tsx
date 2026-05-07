'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

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
import { Label } from '@/shared/ui/shadcn/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/shared/ui/Select';

import { boardOptionsQuery } from '../api/postQueries';
import { useBulkMovePosts } from '../api/usePostMutations';
import type { BulkMovePostResponse } from '../api/postFetchers';

interface Props {
  ids: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted?: (result: BulkMovePostResponse) => void;
}

type Phase =
  | { kind: 'confirm' }
  | { kind: 'result'; result: BulkMovePostResponse };

export function BulkMovePostDialog({
  ids,
  open,
  onOpenChange,
  onCompleted,
}: Props) {
  const [boardId, setBoardId] = useState<string>('');
  const [phase, setPhase] = useState<Phase>({ kind: 'confirm' });
  const { data: boards } = useQuery(boardOptionsQuery());

  const bulkMove = useBulkMovePosts({
    onSuccess: (result) => {
      if (result.failed.length > 0) {
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
    setTimeout(() => {
      setPhase({ kind: 'confirm' });
      setBoardId('');
    }, 100);
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !bulkMove.isPending) handleClose();
      }}
    >
      <AlertDialogContent className="max-w-xl">
        {phase.kind === 'confirm' ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>게시판 일괄 이동</AlertDialogTitle>
              <AlertDialogDescription>
                선택한 {ids.length}개 게시글을 다른 게시판으로 이동합니다. slug가 충돌하는
                게시글은 실패로 분리됩니다.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-2">
              <Label>대상 게시판</Label>
              <Select value={boardId} onValueChange={(v) => setBoardId(v ?? '')}>
                <SelectTrigger>
                  <span>
                    {boards?.find((b) => b.id === boardId)?.name ?? '게시판 선택'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {boards?.map((board) => (
                    <SelectItem key={board.id} value={board.id}>
                      {board.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel disabled={bulkMove.isPending}>취소</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => bulkMove.mutate({ ids, boardId })}
                disabled={bulkMove.isPending || ids.length === 0 || !boardId}
              >
                {bulkMove.isPending ? '이동 중...' : `${ids.length}개 이동`}
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>일괄 이동 결과</AlertDialogTitle>
              <AlertDialogDescription>
                {phase.result.updated.length}개 이동, {phase.result.failed.length}개 실패
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-3">
              <p className="text-sm font-medium">실패 항목</p>
              <ul className="max-h-80 space-y-2 overflow-y-auto rounded-md border bg-muted/30 p-2 text-sm">
                {phase.result.failed.map((item) => (
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
