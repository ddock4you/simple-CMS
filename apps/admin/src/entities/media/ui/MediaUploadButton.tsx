'use client';

import { useRef } from 'react';
import { Upload } from 'lucide-react';

import type { UploadMediaResponse } from '@simple-cms/types';

import { Button } from '@/shared/ui/Button';

import { useUploadMedia } from '../api/useUploadMedia';

const DEFAULT_ACCEPT_MIME = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
];

interface MediaUploadButtonProps {
  category?: string;
  /** 업로드 후 콜백 (Picker에서 자동 선택용) */
  onUploaded?: (data: UploadMediaResponse) => void;
  /** 토스트 자동 표시 여부 (기본 true) */
  silent?: boolean;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'secondary';
  label?: string;
  /**
   * 업로드 엔드포인트 override. 기본 `/api/media/upload`.
   * 브랜딩 업로드(Stage 7l)는 `/api/media/branding-upload` 전달.
   */
  endpoint?: string;
  /**
   * `<input accept>`로 파일 선택 다이얼로그 필터에 사용. 기본 일반 이미지(SVG 포함).
   * 브랜딩(SVG 차단)은 호출자가 명시적으로 좁혀서 전달.
   */
  acceptMimeTypes?: string[];
}

export function MediaUploadButton({
  category = 'home',
  onUploaded,
  silent,
  size = 'default',
  variant = 'default',
  label = '업로드',
  endpoint,
  acceptMimeTypes,
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
    upload.mutate({ file, category, endpoint });
  };

  const acceptValue = (acceptMimeTypes ?? DEFAULT_ACCEPT_MIME).join(',');

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
        accept={acceptValue}
        className="hidden"
        onChange={handleChange}
      />
    </>
  );
}
