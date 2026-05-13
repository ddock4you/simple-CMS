'use client';

import { ConfirmDeleteDialog } from '@/shared/ui/ConfirmDeleteDialog';

interface DeleteSubpageDialogProps {
  title: string;
  isPending: boolean;
  onConfirm: () => void;
}

export function DeleteSubpageDialog({ title, isPending, onConfirm }: DeleteSubpageDialogProps) {
  return (
    <ConfirmDeleteDialog
      entityName={title}
      dialogTitle="서브 페이지 삭제"
      isPending={isPending}
      onConfirm={onConfirm}
    />
  );
}
