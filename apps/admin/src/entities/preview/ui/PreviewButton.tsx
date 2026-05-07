'use client';

import { Eye, Loader2 } from 'lucide-react';

import type { PreviewEntityType } from '@simple-cms/types';

import { Button } from '@/shared/ui/Button';

import { useIssuePreviewToken } from '../api/usePreviewMutations';

interface PreviewButtonProps {
  entityType: PreviewEntityType;
  entityId: string;
  disabled?: boolean;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm';
}

export function PreviewButton({
  entityType,
  entityId,
  disabled,
  variant = 'outline',
  size = 'default',
}: PreviewButtonProps) {
  const mutation = useIssuePreviewToken();
  const isPending = mutation.isPending;

  return (
    <Button
      variant={variant}
      size={size}
      type="button"
      disabled={disabled || isPending}
      onClick={() => mutation.mutate({ entityType, entityId })}
    >
      {isPending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Eye className="size-4" />
      )}
      미리보기
    </Button>
  );
}
