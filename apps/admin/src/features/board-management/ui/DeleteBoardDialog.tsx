'use client';

import { ConfirmDeleteDialog } from '@/shared/ui/ConfirmDeleteDialog';

interface DeleteBoardDialogProps {
  name: string;
  isPending: boolean;
  onConfirm: () => void;
}

export function DeleteBoardDialog({ name, isPending, onConfirm }: DeleteBoardDialogProps) {
  return (
    <ConfirmDeleteDialog
      entityName={name}
      dialogTitle="게시판 삭제"
      isPending={isPending}
      onConfirm={onConfirm}
    />
  );
}
