'use client';

import { format } from 'date-fns';
import type { MediaListItem } from '@simple-cms/types';

import { resolveMediaPreviewUrl } from '@/shared/lib/mediaUrl';
import { Checkbox } from '@/shared/ui/shadcn/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/ui/shadcn/tooltip';

import { formatFileSize } from '../lib/formatFileSize';

interface MediaCardProps {
  media: MediaListItem;
  onClick?: (media: MediaListItem) => void;
  /** 선택 모드일 때 테두리 강조 (Picker 단일 선택 상태 표시용) */
  selected?: boolean;
  /** 체크박스 선택 모드 활성화 — true면 우측 상단 체크박스 표시 */
  selectable?: boolean;
  /** 체크박스 선택 여부 */
  checked?: boolean;
  /** 체크박스 토글 콜백 */
  onToggleSelect?: (id: string, next: boolean) => void;
  /**
   * MIME 타입 제약으로 선택 불가한 상태 (Stage 7l).
   * Picker의 acceptMimeTypes에 매칭되지 않을 때 true.
   * 클릭 차단 + opacity-50 + Tooltip 안내.
   */
  disabled?: boolean;
  /** disabled일 때 Tooltip에 표시할 안내 메시지 */
  disabledReason?: string;
}

export function MediaCard({
  media,
  onClick,
  selected,
  selectable,
  checked,
  onToggleSelect,
  disabled = false,
  disabledReason,
}: MediaCardProps) {
  const isImage = media.mimeType.startsWith('image/');
  const handleClick = () => {
    if (disabled) return;
    onClick?.(media);
  };

  const cardBody = (
    <div
      className={`group relative flex flex-col rounded-md border bg-card text-left transition-colors hover:border-primary ${
        selected || checked ? 'border-primary ring-2 ring-primary' : ''
      } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      {selectable && !disabled && (
        <div
          className={`absolute right-2 top-2 z-10 flex size-6 items-center justify-center rounded-md border bg-background/90 shadow-sm backdrop-blur transition-opacity ${
            checked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            aria-label={`${media.originalFilename} 선택`}
            checked={checked ?? false}
            onCheckedChange={(next) =>
              onToggleSelect?.(media.id, next === true)
            }
          />
        </div>
      )}

      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        aria-disabled={disabled}
        className="flex flex-col text-left focus:outline-none focus:ring-2 focus:ring-primary rounded-md disabled:cursor-not-allowed"
      >
        <div className="relative aspect-square w-full overflow-hidden rounded-t-md bg-muted">
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resolveMediaPreviewUrl(media.url)}
              alt={media.alt ?? media.originalFilename}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
              {media.mimeType}
            </div>
          )}
        </div>
        <div className="space-y-1 p-2">
          <p
            className="truncate text-sm font-medium"
            title={media.originalFilename}
          >
            {media.originalFilename}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatFileSize(media.size)}
          </p>
          <p className="text-xs text-muted-foreground">
            {media.uploadedBy?.name ?? '(삭제된 사용자)'} ·{' '}
            {format(new Date(media.createdAt), 'yyyy-MM-dd')}
          </p>
        </div>
      </button>
    </div>
  );

  if (disabled && disabledReason) {
    return (
      <Tooltip>
        <TooltipTrigger render={<div />}>{cardBody}</TooltipTrigger>
        <TooltipContent>{disabledReason}</TooltipContent>
      </Tooltip>
    );
  }

  return cardBody;
}
