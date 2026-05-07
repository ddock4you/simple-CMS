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
} from '@/shared/ui/AlertDialog';
import { Button } from '@/shared/ui/shadcn/button';

interface DeleteMenuSetDialogProps {
  name: string;
  isPending: boolean;
  onConfirm: () => void;
}

export function DeleteMenuSetDialog({
  name,
  isPending,
  onConfirm,
}: DeleteMenuSetDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button variant="ghost" size="sm" disabled={isPending} />
        }
      >
        <span className="text-destructive">삭제</span>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>메뉴 삭제</AlertDialogTitle>
          <AlertDialogDescription>
            &quot;{name}&quot; 메뉴를 삭제하시겠습니까? 포함된 모든 항목도 함께 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
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
