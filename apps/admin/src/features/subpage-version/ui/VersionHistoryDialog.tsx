'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Pin, PinOff, Trash2, History, RotateCcw } from 'lucide-react';

import type { SubpageVersionSource } from '@simple-cms/types';

import { Badge } from '@/shared/ui/shadcn/badge';
import { Button } from '@/shared/ui/shadcn/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/shadcn/dialog';
import { Input } from '@/shared/ui/shadcn/input';
import { Label } from '@/shared/ui/shadcn/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/shared/ui/shadcn/select';
import { Switch } from '@/shared/ui/shadcn/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/shadcn/table';
import { Skeleton } from '@/shared/ui/shadcn/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/shadcn/alert-dialog';
import { usePermission } from '@/entities/auth/ui/PermissionProvider';

import { subpageVersionListOptions } from '../api/versionQueries';
import {
  useDeleteSubpageVersion,
  useToggleSubpageVersionPin,
} from '../api/useVersionMutations';
import {
  formatVersionSubject,
  parseVersionLabel,
} from '../lib/parseVersionLabel';
import {
  DEFAULT_SUBPAGE_VERSION_FILTERS,
  type SubpageVersionListFilters,
} from '../model/versionFilters';
import {
  SUBPAGE_VERSION_FALLBACK_TEXT,
  SUBPAGE_VERSION_SOURCE_BADGE_VARIANT,
  SUBPAGE_VERSION_SOURCE_LABELS,
} from '../model/versionLabels';

interface VersionHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subpageId: string;
  onViewDetail: (versionId: string) => void;
  onRollbackClick: (versionId: string) => void;
}

const SOURCE_OPTIONS: Array<{ value: SubpageVersionSource; label: string }> = [
  { value: 'MANUAL', label: SUBPAGE_VERSION_SOURCE_LABELS.MANUAL },
  { value: 'AUTO_PUBLISH', label: SUBPAGE_VERSION_SOURCE_LABELS.AUTO_PUBLISH },
  { value: 'PRE_ROLLBACK', label: SUBPAGE_VERSION_SOURCE_LABELS.PRE_ROLLBACK },
];

export function VersionHistoryDialog({
  open,
  onOpenChange,
  subpageId,
  onViewDetail,
  onRollbackClick,
}: VersionHistoryDialogProps) {
  const canUpdate = usePermission('subpages', 'update');

  const [filters, setFilters] = useState<SubpageVersionListFilters>(
    DEFAULT_SUBPAGE_VERSION_FILTERS,
  );
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    ...subpageVersionListOptions(subpageId, filters),
    enabled: open,
  });

  const { mutate: togglePin, isPending: pinPending } =
    useToggleSubpageVersionPin(subpageId);
  const { mutate: deleteVersion, isPending: deletePending } =
    useDeleteSubpageVersion(subpageId);

  const authorOptions = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, string>();
    for (const item of data.items) {
      if (item.createdBy) {
        map.set(item.createdBy.id, item.createdBy.name);
      }
    }
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [data]);

  const updateFilter = <K extends keyof SubpageVersionListFilters>(
    key: K,
    value: SubpageVersionListFilters[K],
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const resetFilters = () => setFilters(DEFAULT_SUBPAGE_VERSION_FILTERS);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange} disablePointerDismissal>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="size-5" aria-hidden />
              버전 이력
            </DialogTitle>
            <DialogDescription>
              저장된 버전 목록입니다. 필터로 범위를 좁히거나, 상세에서 내용을 확인한 뒤 복원하세요.
            </DialogDescription>
          </DialogHeader>

          {/* 필터 영역 */}
          <div className="grid grid-cols-1 gap-3 rounded-md border bg-muted/20 p-3 text-sm md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <Label htmlFor="filter-from" className="text-xs">
                시작일
              </Label>
              <Input
                id="filter-from"
                type="date"
                value={filters.from ?? ''}
                onChange={(e) => updateFilter('from', e.target.value || null)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="filter-to" className="text-xs">
                종료일
              </Label>
              <Input
                id="filter-to"
                type="date"
                value={filters.to ?? ''}
                onChange={(e) => updateFilter('to', e.target.value || null)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="filter-source" className="text-xs">
                생성 원인
              </Label>
              <Select
                value={filters.source ?? 'ALL'}
                onValueChange={(v) =>
                  updateFilter('source', v === 'ALL' ? null : (v as SubpageVersionSource))
                }
              >
                <SelectTrigger id="filter-source" className="w-full">
                  <span>
                    {filters.source
                      ? SUBPAGE_VERSION_SOURCE_LABELS[filters.source]
                      : '전체'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">전체</SelectItem>
                  {SOURCE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="filter-author" className="text-xs">
                작성자
              </Label>
              <Select
                value={filters.authorId ?? 'ALL'}
                onValueChange={(v) =>
                  updateFilter('authorId', v === 'ALL' ? null : v)
                }
              >
                <SelectTrigger id="filter-author" className="w-full">
                  <span>
                    {filters.authorId
                      ? authorOptions.find((opt) => opt.id === filters.authorId)?.name ?? '—'
                      : '전체'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">전체</SelectItem>
                  {authorOptions.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 md:col-span-2">
              <Switch
                id="filter-pinned"
                checked={filters.pinnedOnly}
                onCheckedChange={(next) => updateFilter('pinnedOnly', next)}
              />
              <Label htmlFor="filter-pinned" className="text-xs">
                고정된 버전만 표시
              </Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="ml-auto"
              >
                필터 초기화
              </Button>
            </div>
          </div>

          {/* 목록 */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]">생성 시각</TableHead>
                  <TableHead className="w-[100px]">작성자</TableHead>
                  <TableHead className="w-[90px]">원인</TableHead>
                  <TableHead>메모</TableHead>
                  <TableHead className="w-[200px] text-right">액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading &&
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={`skeleton-${i}`}>
                      <TableCell colSpan={5}>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    </TableRow>
                  ))}
                {isError && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-destructive">
                      버전 목록을 불러오지 못했습니다.
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && !isError && data && data.items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      조건에 맞는 버전이 없습니다.
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading &&
                  data &&
                  data.items.map((item) => {
                    const parsed = parseVersionLabel(item.label);
                    const subject = parsed.subject
                      ? formatVersionSubject(parsed.subject)
                      : null;
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="text-xs">
                          {format(new Date(item.createdAt), 'yyyy-MM-dd HH:mm')}
                        </TableCell>
                        <TableCell className="text-xs">
                          {item.createdBy?.name ?? '—'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={SUBPAGE_VERSION_SOURCE_BADGE_VARIANT[item.sourceAction]}
                            className="text-[10px]"
                          >
                            {SUBPAGE_VERSION_SOURCE_LABELS[item.sourceAction]}
                          </Badge>
                          {item.isPinned && (
                            <Pin
                              className="ml-1 inline size-3 text-amber-600"
                              aria-hidden
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {subject ? (
                            <span
                              className="line-clamp-1"
                              title={parsed.subject}
                            >
                              {subject}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {SUBPAGE_VERSION_FALLBACK_TEXT[item.sourceAction]}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onViewDetail(item.id)}
                            >
                              상세
                            </Button>
                            {canUpdate && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  disabled={pinPending}
                                  onClick={() =>
                                    togglePin({
                                      versionId: item.id,
                                      isPinned: !item.isPinned,
                                    })
                                  }
                                  title={item.isPinned ? '고정 해제' : '고정'}
                                  aria-label={item.isPinned ? '고정 해제' : '고정'}
                                >
                                  {item.isPinned ? (
                                    <PinOff className="size-4" aria-hidden />
                                  ) : (
                                    <Pin className="size-4" aria-hidden />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => onRollbackClick(item.id)}
                                  title="이 버전으로 복원"
                                  aria-label="이 버전으로 복원"
                                >
                                  <RotateCcw className="size-4" aria-hidden />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  disabled={item.isPinned}
                                  onClick={() => setPendingDeleteId(item.id)}
                                  title={
                                    item.isPinned
                                      ? '고정 해제 후 삭제 가능'
                                      : '삭제'
                                  }
                                  aria-label="삭제"
                                >
                                  <Trash2 className="size-4" aria-hidden />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>

          {/* 페이지네이션 */}
          {data && data.total > 0 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                총 {data.total.toLocaleString()}건 · {filters.page}/{totalPages} 페이지
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={filters.page <= 1}
                  onClick={() =>
                    setFilters((prev) => ({ ...prev, page: prev.page - 1 }))
                  }
                >
                  이전
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={filters.page >= totalPages}
                  onClick={() =>
                    setFilters((prev) => ({ ...prev, page: prev.page + 1 }))
                  }
                >
                  다음
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 */}
      <AlertDialog
        open={!!pendingDeleteId}
        onOpenChange={(next) => {
          if (!next) setPendingDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>버전 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 버전을 삭제합니다. 삭제된 버전은 복구할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePending}>취소</AlertDialogCancel>
            <AlertDialogAction
              disabled={deletePending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (pendingDeleteId) {
                  deleteVersion(pendingDeleteId, {
                    onSuccess: () => setPendingDeleteId(null),
                  });
                }
              }}
            >
              {deletePending ? '삭제 중...' : '삭제'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
