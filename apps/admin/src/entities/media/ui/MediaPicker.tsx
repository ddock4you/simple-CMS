'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import type { MediaListFilters, MediaListItem } from '@simple-cms/types';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/shadcn/dialog';
import { usePermission } from '@/entities/auth/ui/PermissionProvider'; // @fsd-allow: auth는 cross-cutting — PermissionProvider 추후 shared/ui로 이전 예정

import { mediaListOptions } from '../api/mediaQueries';
import { DEFAULT_MEDIA_PAGE_SIZE } from '../model/mediaFilters';
import { MediaFilters } from './MediaFilters';
import { MediaGrid } from './MediaGrid';
import { MediaPagination } from './MediaPagination';
import { MediaUploadButton } from './MediaUploadButton';

interface MediaPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 미디어 선택 시 호출. 호출자가 url/originalName/mediaId 등을 폼에 주입 */
  onSelect: (media: MediaListItem) => void;
  /** 업로드 카테고리. 호출처 유즈케이스에 맞게 'home', 'content' 등 전달 */
  category?: string;
  title?: string;
  description?: string;
  /**
   * Stage 7l — 업로드 엔드포인트 override.
   * 미전달 시 기본 `/api/media/upload`. 브랜딩은 `/api/media/branding-upload`.
   */
  endpoint?: string;
  /**
   * Stage 7l — 선택/업로드 가능 MIME 화이트리스트.
   * 미전달 시 모든 미디어 선택 가능 (backward compat).
   * 라이브러리 그리드의 비매칭 카드는 disabled + Tooltip 처리.
   * MediaUploadButton의 `<input accept>` 필터에도 전달.
   */
  acceptMimeTypes?: string[];
  /** disabled 카드의 Tooltip 메시지 (acceptMimeTypes 전달 시 표시) */
  disabledReason?: string;
}

const PICKER_PAGE_SIZE = 12;

export function MediaPicker({
  open,
  onOpenChange,
  onSelect,
  category = 'home',
  title = '미디어 선택',
  description = '라이브러리에서 선택하거나 새 파일을 업로드하세요.',
  endpoint,
  acceptMimeTypes,
  disabledReason,
}: MediaPickerProps) {
  const canCreate = usePermission('media', 'create');

  // Picker 내부 상태 — URL params를 오염시키지 않음
  const [filters, setFilters] = useState<MediaListFilters>({
    page: 1,
    pageSize: PICKER_PAGE_SIZE,
  });

  const { data, isLoading } = useQuery({
    ...mediaListOptions(filters),
    enabled: open,
  });

  const handleFilterChange = (next: { q?: string | null; mimeType?: string | null }) => {
    setFilters((prev) => ({
      ...prev,
      q: next.q !== undefined ? next.q ?? undefined : prev.q,
      mimeType:
        next.mimeType !== undefined ? next.mimeType ?? undefined : prev.mimeType,
      page: 1,
    }));
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const handleSelect = (media: MediaListItem) => {
    onSelect(media);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <MediaFilters
              currentQ={filters.q ?? null}
              currentMimeType={filters.mimeType ?? null}
              onChange={handleFilterChange}
            />
            {canCreate && (
              <MediaUploadButton
                category={category}
                endpoint={endpoint}
                acceptMimeTypes={acceptMimeTypes}
                onUploaded={(uploaded) =>
                  handleSelect({
                    id: uploaded.id,
                    filename: uploaded.filename,
                    originalFilename: uploaded.originalFilename,
                    mimeType: uploaded.mimeType,
                    size: uploaded.size,
                    url: uploaded.url,
                    alt: uploaded.alt,
                    contentHash: uploaded.contentHash,
                    uploadedById: uploaded.uploadedById,
                    uploadedBy: uploaded.uploadedBy,
                    createdAt: uploaded.createdAt,
                  })
                }
              />
            )}
          </div>

          <MediaGrid
            items={data?.items ?? []}
            isLoading={isLoading}
            onSelect={handleSelect}
            acceptMimeTypes={acceptMimeTypes}
            disabledReason={disabledReason}
          />

          <MediaPagination
            page={data?.page ?? filters.page ?? 1}
            pageSize={data?.pageSize ?? filters.pageSize ?? DEFAULT_MEDIA_PAGE_SIZE}
            total={data?.total ?? 0}
            onPageChange={handlePageChange}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
