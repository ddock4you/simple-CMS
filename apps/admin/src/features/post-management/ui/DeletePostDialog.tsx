'use client';

import { ConfirmDeleteDialog } from '@/shared/ui/ConfirmDeleteDialog';

interface DeletePostDialogProps {
  title: string;
  isPending: boolean;
  onConfirm: () => void;
}

export function DeletePostDialog({ title, isPending, onConfirm }: DeletePostDialogProps) {
  return (
    <ConfirmDeleteDialog
      entityName={title}
      dialogTitle="게시글 삭제"
      isPending={isPending}
      onConfirm={onConfirm}
    />
  );
}
