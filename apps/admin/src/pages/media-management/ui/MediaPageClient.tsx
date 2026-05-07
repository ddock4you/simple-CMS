'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';

import type { MediaListFilters, MediaListItem } from '@simple-cms/types';

import { Button } from '@/shared/ui/Button';
import { Checkbox } from '@/shared/ui/shadcn/checkbox';
import { usePermission } from '@/entities/auth/ui/PermissionProvider';

import { ListSummary } from '@/shared/ui/ListSummary';
import { ListPagination } from '@/shared/ui/ListPagination';
import { mediaListOptions } from '@/entities/media/api/mediaQueries';
import { MediaFilters } from '@/entities/media/ui/MediaFilters';
import { MediaGrid } from '@/entities/media/ui/MediaGrid';
import { MediaUploadButton } from '@/entities/media/ui/MediaUploadButton';
import { BulkDeleteMediaDialog } from '@/features/media-management/ui/BulkDeleteMediaDialog';
import { MediaDetailDialog } from '@/features/media-management/ui/MediaDetailDialog';

interface MediaPageClientProps {
  filters: MediaListFilters & { page: number; pageSize: number };
  canCreate: boolean;
}

export function MediaPageClient({ filters, canCreate }: MediaPageClientProps) {
  const { data, isLoading } = useQuery(mediaListOptions(filters));
  const canDelete = usePermission('media', 'delete');

  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const items = data?.items ?? [];
  const currentPageIds = useMemo(() => items.map((m) => m.id), [items]);

  const allCurrentSelected =
    currentPageIds.length > 0 &&
    currentPageIds.every((id) => selectedIds.has(id));
  const someCurrentSelected = currentPageIds.some((id) => selectedIds.has(id));
  const indeterminate = someCurrentSelected && !allCurrentSelected;

  const handleCardClick = (media: MediaListItem) => {
    setDetailId(media.id);
    setDetailOpen(true);
  };

  const toggleSelect = (id: string, next: boolean) => {
    setSelectedIds((prev) => {
      const s = new Set(prev);
      if (next) s.add(id);
      else s.delete(id);
      return s;
    });
  };

  const toggleAllCurrentPage = (next: boolean) => {
    setSelectedIds((prev) => {
      const s = new Set(prev);
      if (next) {
        currentPageIds.forEach((id) => s.add(id));
      } else {
        currentPageIds.forEach((id) => s.delete(id));
      }
      return s;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MediaFilters
          currentQ={filters.q ?? null}
          currentMimeType={filters.mimeType ?? null}
        />
        {canCreate && <MediaUploadButton category="library" />}
      </div>

      {canDelete && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border bg-muted/30 px-3 py-2 text-sm">
          <label className="flex items-center gap-2">
            <Checkbox
              checked={
                allCurrentSelected
                  ? true
                  : indeterminate
                    ? 'indeterminate'
                    : false
              }
              onCheckedChange={(next) => toggleAllCurrentPage(next === true)}
              disabled={currentPageIds.length === 0}
              aria-label="현재 페이지 전체 선택"
            />
            <span className="text-muted-foreground">
              현재 페이지 전체 선택
            </span>
          </label>

          <div className="h-4 w-px bg-border" />

          <span className="text-muted-foreground">
            {selectedIds.size > 0
              ? `${selectedIds.size}개 선택됨`
              : '선택된 항목 없음'}
          </span>

          {selectedIds.size > 0 && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearSelection}
              >
                전체 해제
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => setBulkDeleteOpen(true)}
              >
                <Trash2 className="size-4" />
                선택 삭제 ({selectedIds.size})
              </Button>
            </>
          )}
        </div>
      )}

      <ListSummary
        total={data?.total ?? 0}
        page={data?.page ?? filters.page}
        pageSize={data?.pageSize ?? filters.pageSize}
      />
      <MediaGrid
        items={items}
        isLoading={isLoading}
        onSelect={handleCardClick}
        selectable={canDelete}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
      />
      <ListPagination
        total={data?.total ?? 0}
        page={data?.page ?? filters.page}
        pageSize={data?.pageSize ?? filters.pageSize}
      />

      <MediaDetailDialog
        mediaId={detailId}
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) setDetailId(null);
        }}
      />

      <BulkDeleteMediaDialog
        ids={Array.from(selectedIds)}
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        onCompleted={(result) => {
          // 성공적으로 삭제된 id는 선택에서 제거. blocked는 유지 (재시도 가능)
          setSelectedIds((prev) => {
            const s = new Set(prev);
            result.deleted.forEach((id) => s.delete(id));
            return s;
          });
        }}
      />
    </div>
  );
}
