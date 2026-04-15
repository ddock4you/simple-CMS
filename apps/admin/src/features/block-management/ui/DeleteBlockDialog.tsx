'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/ui/shadcn/alert-dialog';
import { Button } from '@/shared/ui/shadcn/button';

interface DeleteBlockDialogProps {
  label: string;
  isPending: boolean;
  onConfirm: () => void;
}

export function DeleteBlockDialog({
  label,
  isPending,
  onConfirm,
}: DeleteBlockDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button variant="destructive" size="sm" disabled={isPending} />
        }
      >
        삭제
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>블록 삭제</AlertDialogTitle>
          <AlertDialogDescription>
            &quot;{label}&quot; 블록을 삭제하시겠습니까? 이 작업은 되돌릴 수
            없습니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isPending}>
            삭제
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
