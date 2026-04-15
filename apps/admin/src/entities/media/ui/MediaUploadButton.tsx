'use client';

import { useRef } from 'react';
import { Upload } from 'lucide-react';

import type { UploadMediaResponse } from '@simple-cms/types';

import { Button } from '@/shared/ui/shadcn/button';

import { useUploadMedia } from '../api/useUploadMedia';

interface MediaUploadButtonProps {
  category?: string;
  /** 업로드 후 콜백 (Picker에서 자동 선택용) */
  onUploaded?: (data: UploadMediaResponse) => void;
  /** 토스트 자동 표시 여부 (기본 true) */
  silent?: boolean;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'secondary';
  label?: string;
}

export function MediaUploadButton({
  category = 'home',
  onUploaded,
  silent,
  size = 'default',
  variant = 'default',
  label = '업로드',
}: MediaUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadMedia({ onSuccess: onUploaded, silent });

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // 같은 파일 재선택 허용
    if (!file) return;
    upload.mutate({ file, category });
  };

  return (
    <>
      <Button
        type="button"
        onClick={handleClick}
        disabled={upload.isPending}
        size={size}
        variant={variant}
      >
        <Upload className="mr-1 size-4" />
        {upload.isPending ? '업로드 중...' : label}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
        className="hidden"
        onChange={handleChange}
      />
    </>
  );
}
