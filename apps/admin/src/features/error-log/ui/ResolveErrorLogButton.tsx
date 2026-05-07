'use client';

import { Check, Undo2 } from 'lucide-react';

import { usePermission } from '@/entities/auth/ui/PermissionProvider';
import { Button } from '@/shared/ui/Button';

import { useSetErrorLogResolved } from '../api/useErrorLogMutations';

interface ResolveErrorLogButtonProps {
  id: string;
  isResolved: boolean;
  size?: 'sm' | 'default';
  variant?: 'default' | 'outline' | 'ghost';
}

export function ResolveErrorLogButton({
  id,
  isResolved,
  size = 'sm',
  variant = 'outline',
}: ResolveErrorLogButtonProps) {
  const canUpdate = usePermission('errorLogs', 'update');
  const mutation = useSetErrorLogResolved();

  if (!canUpdate) return null;

  return (
    <Button
      variant={variant}
      size={size}
      disabled={mutation.isPending}
      onClick={() => mutation.mutate({ id, isResolved: !isResolved })}
    >
      {isResolved ? (
        <>
          <Undo2 className="size-4" />
          미해결로 변경
        </>
      ) : (
        <>
          <Check className="size-4" />
          해결 처리
        </>
      )}
    </Button>
  );
}
