'use client';

import type { MediaListItem } from '@simple-cms/types';

import { MediaCard } from './MediaCard';

interface MediaGridProps {
  items: MediaListItem[];
  isLoading?: boolean;
  onSelect?: (media: MediaListItem) => void;
  /** Picker 단일 선택 상태 표시 (테두리 강조). 체크박스와 독립적 */
  selectedId?: string | null;
  /** 체크박스 선택 모드 활성화 */
  selectable?: boolean;
  /** 체크박스로 선택된 id 집합 */
  selectedIds?: Set<string>;
  /** 체크박스 토글 콜백 */
  onToggleSelect?: (id: string, next: boolean) => void;
  /**
   * Stage 7l — 선택 가능 MIME 화이트리스트.
   * 미전달 시 모든 미디어 선택 가능 (backward compat).
   * 매칭 안 되는 카드는 disabled + Tooltip 처리 (hide 아님).
   */
  acceptMimeTypes?: string[];
  /** disabled 카드의 Tooltip 메시지 */
  disabledReason?: string;
}

export function MediaGrid({
  items,
  isLoading,
  onSelect,
  selectedId,
  selectable,
  selectedIds,
  onToggleSelect,
  acceptMimeTypes,
  disabledReason,
}: MediaGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square animate-pulse rounded-md bg-muted"
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
        조건에 맞는 미디어가 없습니다.
      </div>
    );
  }

  const acceptSet = acceptMimeTypes ? new Set(acceptMimeTypes) : null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((media) => {
        const disabled = acceptSet ? !acceptSet.has(media.mimeType) : false;
        return (
          <MediaCard
            key={media.id}
            media={media}
            onClick={onSelect}
            selected={selectedId === media.id}
            selectable={selectable}
            checked={selectedIds?.has(media.id) ?? false}
            onToggleSelect={onToggleSelect}
            disabled={disabled}
            disabledReason={disabled ? disabledReason : undefined}
          />
        );
      })}
    </div>
  );
}
