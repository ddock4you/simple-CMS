'use client';

import { useState } from 'react';
import { ImageOff, Library, X, Paperclip } from 'lucide-react';

import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/shadcn/input';
import { resolveMediaPreviewUrl } from '@/shared/lib/mediaUrl';
import { usePermission } from '@/entities/auth/ui/PermissionProvider'; // @fsd-allow: auth는 cross-cutting — PermissionProvider 추후 shared/ui로 이전 예정

import { MediaPicker } from './MediaPicker';
import { MediaUploadButton } from './MediaUploadButton';

/**
 * ImageUrlInput의 onChange가 전달하는 값.
 * url/mediaId/originalName 세 필드를 하나의 콜백으로 묶어 전달하여,
 * 호출 측이 단일 state 업데이트로 3개 필드를 일괄 반영할 수 있게 한다.
 *
 * 과거에는 onChange / onMediaIdChange / onOriginalNameChange 3개의 콜백을 순차 호출했으나,
 * React 18+ 자동 배칭 환경에서 호출 측이 `setState({ ...value, field })`처럼 direct value를
 * 사용하면 두 번째 호출이 첫 번째 호출의 변경을 closure 경합으로 덮어쓰는 버그가 있었다.
 * 단일 콜백 + 한 번의 state 업데이트로 근본 해결.
 */
export interface ImageUrlInputValue {
  url: string;
  mediaId: string | null;
  originalName: string | null;
}

interface ImageUrlInputProps {
  /** 현재 이미지 URL */
  value: string;
  /** 현재 원본 파일명 (업로드 시 보존된 이름) */
  originalName?: string | null;
  /** Media 라이브러리 참조 ID (Stage 5a-2). 라이브러리/업로드로 선택하면 채워지고 URL 수기 입력 시 null */
  mediaId?: string | null;
  /**
   * 값 변경 콜백 — url/mediaId/originalName 3필드를 한 번에 전달.
   * 호출 측은 단일 state 업데이트로 3필드를 일괄 반영할 것.
   */
  onChange: (next: ImageUrlInputValue) => void;
  /** 업로드 카테고리 (서브 디렉토리) — 기본 'home' */
  category?: string;
  /** Input의 placeholder */
  placeholder?: string;
  /** input id */
  id?: string;
  /** 추가 클래스 */
  className?: string;
  /**
   * Stage 7l — 업로드 엔드포인트 override.
   * 미전달 시 기본 `/api/media/upload`. 브랜딩은 `/api/media/branding-upload`.
   */
  endpoint?: string;
  /**
   * Stage 7l — 선택/업로드 가능 MIME 화이트리스트.
   * MediaUploadButton 파일 다이얼로그 + MediaPicker 그리드 disabled 처리에 사용.
   */
  acceptMimeTypes?: string[];
  /** acceptMimeTypes 전달 시 MediaPicker disabled 카드의 Tooltip 메시지 */
  disabledReason?: string;
  /**
   * Stage 7l — URL 직접 입력 비활성화. 브랜딩처럼 외부 URL을 차단하는 호출자가 사용.
   * true면 Input이 readOnly + 안내 문구 표시. 업로드/라이브러리만 허용.
   */
  disableUrlInput?: boolean;
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
  mediaId = null,
  category = 'home',
  placeholder = 'https://... 또는 /uploads/...',
  id,
  className,
  endpoint,
  acceptMimeTypes,
  disabledReason,
  disableUrlInput = false,
}: ImageUrlInputProps) {
  const [previewError, setPreviewError] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const canReadMedia = usePermission('media', 'read');

  const handleUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextUrl = event.target.value;
    onChange({
      url: nextUrl,
      mediaId: null, // URL 수기 입력은 라이브러리 무관
      originalName: extractFilenameFromUrl(nextUrl),
    });
    setPreviewError(false);
  };

  const handleClear = () => {
    onChange({ url: '', mediaId: null, originalName: null });
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
          placeholder={
            disableUrlInput
              ? '업로드 또는 라이브러리에서 선택해주세요.'
              : placeholder
          }
          readOnly={disableUrlInput}
          className="min-w-[200px] flex-1"
        />
        <MediaUploadButton
          category={category}
          endpoint={endpoint}
          acceptMimeTypes={acceptMimeTypes}
          variant="outline"
          label="업로드"
          onUploaded={(uploaded) => {
            onChange({
              url: uploaded.url,
              mediaId: uploaded.id,
              originalName: uploaded.originalFilename ?? null,
            });
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
        endpoint={endpoint}
        acceptMimeTypes={acceptMimeTypes}
        disabledReason={disabledReason}
        onSelect={(media) => {
          onChange({
            url: media.url,
            mediaId: media.id,
            originalName: media.originalFilename,
          });
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
