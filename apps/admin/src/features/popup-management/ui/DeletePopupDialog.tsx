'use client';

import { ConfirmDeleteDialog } from '@/shared/ui/ConfirmDeleteDialog';

interface DeletePopupDialogProps {
  title: string;
  isPending: boolean;
  onConfirm: () => void;
}

export function DeletePopupDialog({ title, isPending, onConfirm }: DeletePopupDialogProps) {
  return (
    <ConfirmDeleteDialog
      entityName={title}
      dialogTitle="메인 팝업 삭제"
      isPending={isPending}
      onConfirm={onConfirm}
    />
  );
}
