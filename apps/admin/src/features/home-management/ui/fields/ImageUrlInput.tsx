'use client';

import { useState } from 'react';
import { ImageOff, Library, X, Paperclip } from 'lucide-react';

import { Button } from '@/shared/ui/shadcn/button';
import { Input } from '@/shared/ui/shadcn/input';
import { resolveMediaPreviewUrl } from '@/shared/lib/mediaUrl';
import { usePermission } from '@/entities/auth/ui/PermissionProvider';

import { MediaPicker } from '@/features/media-management/ui/MediaPicker';
import { MediaUploadButton } from '@/features/media-management/ui/MediaUploadButton';

interface ImageUrlInputProps {
  /** 현재 이미지 URL */
  value: string;
  /** URL 변경 콜백 */
  onChange: (url: string) => void;
  /** 현재 원본 파일명 (업로드 시 보존된 이름) */
  originalName?: string | null;
  /** 원본 파일명 변경 콜백 (업로드/URL 변경/제거 시 호출) */
  onOriginalNameChange?: (name: string | null) => void;
  /** Media 라이브러리 참조 ID (Stage 5a-2). 라이브러리/업로드로 선택하면 채워지고 URL 수기 입력 시 null */
  mediaId?: string | null;
  /** mediaId 변경 콜백 */
  onMediaIdChange?: (mediaId: string | null) => void;
  /** 업로드 카테고리 (서브 디렉토리) — 기본 'home' */
  category?: string;
  /** Input의 placeholder */
  placeholder?: string;
  /** input id */
  id?: string;
  /** 추가 클래스 */
  className?: string;
}

/**
 * 이미지 URL + 파일 업로드 + 미디어 라이브러리 복합 입력 컴포넌트.
 *
 * 입력 방식 3가지:
 * 1. URL 직접 입력 (외부 이미지) — mediaId null
 * 2. [업로드] 파일 선택 — Media 레코드 자동 생성 → mediaId 채워짐
 * 3. [라이브러리] 기존 Media 선택 — mediaId 채워짐
 *
 * 미리보기 URL은 `resolveMediaPreviewUrl()`로 admin(3001) → web(3000) 보정.
 * DB에 저장되는 URL은 상대경로 그대로 유지 (web 렌더링 변경 없음).
 */
const WEB_BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

function extractFilenameFromUrl(url: string): string | null {
  if (!url || url.startsWith('data:')) return null;
  try {
    const parsed = new URL(url, WEB_BASE_URL);
    const segments = parsed.pathname.split('/').filter(Boolean);
    const last = segments.pop();
    if (!last) return null;
    try {
      return decodeURIComponent(last);
    } catch {
      return last;
    }
  } catch {
    return null;
  }
}

export function ImageUrlInput({
  value,
  onChange,
  originalName = null,
  onOriginalNameChange,
  mediaId = null,
  onMediaIdChange,
  category = 'home',
  placeholder = 'https://... 또는 /uploads/...',
  id,
  className,
}: ImageUrlInputProps) {
  const [previewError, setPreviewError] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const canReadMedia = usePermission('media', 'read');

  const handleUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextUrl = event.target.value;
    onChange(nextUrl);
    onOriginalNameChange?.(extractFilenameFromUrl(nextUrl));
    onMediaIdChange?.(null); // URL 수기 입력은 라이브러리 무관
    setPreviewError(false);
  };

  const handleClear = () => {
    onChange('');
    onOriginalNameChange?.(null);
    onMediaIdChange?.(null);
    setPreviewError(false);
  };

  const displayName = originalName ?? extractFilenameFromUrl(value);

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        <Input
          id={id}
          type="text"
          value={value}
          onChange={handleUrlChange}
          placeholder={placeholder}
          className="min-w-[200px] flex-1"
        />
        <MediaUploadButton
          category={category}
          variant="outline"
          label="업로드"
          onUploaded={(uploaded) => {
            onChange(uploaded.url);
            onOriginalNameChange?.(uploaded.originalFilename ?? null);
            onMediaIdChange?.(uploaded.id);
            setPreviewError(false);
          }}
        />
        {canReadMedia && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setPickerOpen(true)}
            title="미디어 라이브러리에서 선택"
          >
            <Library className="size-4" />
            라이브러리
          </Button>
        )}
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            title="이미지 제거"
          >
            <X className="size-4" />
          </Button>
        )}
      </div>

      <MediaPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        category={category}
        onSelect={(media) => {
          onChange(media.url);
          onOriginalNameChange?.(media.originalFilename);
          onMediaIdChange?.(media.id);
          setPreviewError(false);
        }}
      />

      {value && (
        <>
          <div className="mt-2 overflow-hidden rounded-md border bg-muted">
            {previewError ? (
              <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                <ImageOff className="size-4" />
                <span>이미지를 불러올 수 없습니다.</span>
              </div>
            ) : (
              // 외부 URL도 가능하므로 next/image 대신 일반 img
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={resolveMediaPreviewUrl(value)}
                alt="미리보기"
                className="max-h-40 w-full object-contain"
                onError={() => setPreviewError(true)}
              />
            )}
          </div>
          {displayName && (
            <p
              className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground"
              title={displayName}
            >
              <Paperclip className="size-3 shrink-0" aria-hidden="true" />
              <span className="truncate">{displayName}</span>
              {mediaId && (
                <span className="ml-1 rounded bg-secondary px-1 text-[10px]">
                  라이브러리
                </span>
              )}
            </p>
          )}
        </>
      )}
    </div>
  );
}
