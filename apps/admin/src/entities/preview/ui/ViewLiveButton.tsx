'use client';

import { ExternalLink } from 'lucide-react';

import { Button } from '@/shared/ui/Button';

interface ViewLiveButtonProps {
  url: string;
  label?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

/**
 * 공개된 콘텐츠를 새 창에서 여는 버튼.
 * preview(draft 미리보기)와 달리 실제 published URL로 직접 이동.
 */
export function ViewLiveButton({
  url,
  label = '사이트 보기',
  variant = 'outline',
  size = 'default',
}: ViewLiveButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
    >
      <ExternalLink className="size-4" />
      {label}
    </Button>
  );
}
