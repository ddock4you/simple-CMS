'use client';

import { useState } from 'react';
import { CheckCheck } from 'lucide-react';

import { usePermission } from '@/entities/auth/ui/PermissionProvider';
import { Button } from '@/shared/ui/shadcn/button';
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

import { useBulkResolveByFingerprint } from '../api/useErrorLogMutations';

interface BulkResolveButtonProps {
  fingerprint: string;
  count: number;
  hasUnresolved: boolean;
}

export function BulkResolveButton({
  fingerprint,
  count,
  hasUnresolved,
}: BulkResolveButtonProps) {
  const canUpdate = usePermission('errorLogs', 'update');
  const [open, setOpen] = useState(false);
  const mutation = useBulkResolveByFingerprint();

  if (!canUpdate) return null;
  if (!hasUnresolved) return null;

  const handleConfirm = () => {
    mutation.mutate(
      { fingerprint, isResolved: true },
      {
        onSuccess: () => setOpen(false),
      },
    );
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button variant="outline" size="sm">
            <CheckCheck className="size-4" />
            일괄 해결
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>같은 에러 일괄 해결</AlertDialogTitle>
          <AlertDialogDescription>
            이 fingerprint로 기록된 {count}건을 모두 해결 상태로 변경합니다.
            계속하시겠습니까?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>
            취소
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={mutation.isPending}
            onClick={handleConfirm}
          >
            {mutation.isPending ? '처리 중...' : '일괄 해결'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
