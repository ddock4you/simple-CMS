'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { AlertTriangle, Pin, PinOff, RotateCcw } from 'lucide-react';

import type {
  PageBlockListItem,
  SubpageVersionSnapshotBlock,
} from '@simple-cms/types';

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
import { Separator } from '@/shared/ui/shadcn/separator';
import { Skeleton } from '@/shared/ui/shadcn/skeleton';

// @fsd-allow: VersionDetailDialog는 버전 diff 표시를 위해 block-management·subpage-management를 참조 — BlockContentView 추후 shared/ui로 이전 예정
import { BlockContentView } from '@/features/block-management/ui/BlockContentView';
import { blockListOptions } from '@/features/block-management/api/blockQueries';
import { subpageDetailOptions } from '@/features/subpage-management/api/subpageQueries';

import { subpageVersionDetailOptions } from '../api/versionQueries';
import {
  useToggleSubpageVersionPin,
} from '../api/useVersionMutations';
import { parseVersionLabel } from '../lib/parseVersionLabel';
import { summarizeBlockDiff } from '../lib/summarizeBlockDiff';
import {
  SUBPAGE_VERSION_FALLBACK_TEXT,
  SUBPAGE_VERSION_SOURCE_BADGE_VARIANT,
  SUBPAGE_VERSION_SOURCE_LABELS,
} from '../model/versionLabels';
import { BlockDiffSummary } from './BlockDiffSummary';

interface VersionDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subpageId: string;
  versionId: string | null;
  onRollbackClick: (versionId: string) => void;
}

const META_LABELS: Record<string, string> = {
  title: '제목',
  slug: 'URL 슬러그',
  seoTitle: 'SEO 제목',
  seoDescription: 'SEO 설명',
  status: '상태',
  cclType: '공공누리 유형',
  cclAi: 'AI 표시',
  featuredImageId: '대표 이미지 ID',
  displayOrder: '목록 순서',
};

function snapshotBlockToListItem(
  block: SubpageVersionSnapshotBlock,
  index: number,
): PageBlockListItem {
  return {
    id: `snapshot-${index}`,
    subpageId: '',
    blockType: block.blockType,
    configJson: block.configJson,
    isVisible: block.isVisible,
    displayOrder: block.displayOrder,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  };
}

function formatMetaValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? '예' : '아니오';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return JSON.stringify(value);
}

export function VersionDetailDialog({
  open,
  onOpenChange,
  subpageId,
  versionId,
  onRollbackClick,
}: VersionDetailDialogProps) {
  const { data: versionDetail, isLoading: versionLoading } = useQuery({
    ...subpageVersionDetailOptions(subpageId, versionId ?? ''),
    enabled: open && !!versionId,
  });

  const { data: currentSubpage } = useQuery({
    ...subpageDetailOptions(subpageId),
    enabled: open,
  });

  const { data: currentBlocks } = useQuery({
    ...blockListOptions(subpageId),
    enabled: open,
  });

  const { mutate: togglePin, isPending: pinPending } =
    useToggleSubpageVersionPin(subpageId);

  const blockSummary = useMemo(() => {
    if (!versionDetail || !currentBlocks) return null;
    return summarizeBlockDiff(versionDetail.snapshot.blocks, currentBlocks);
  }, [versionDetail, currentBlocks]);

  const parsedLabel = versionDetail
    ? parseVersionLabel(versionDetail.label)
    : null;

  const metaDiff = useMemo(() => {
    if (!versionDetail || !currentSubpage) return [];
    const snapshot = versionDetail.snapshot.meta;
    const rows: Array<{ field: string; before: unknown; after: unknown }> = [];
    const compareKeys: Array<keyof typeof snapshot> = [
      'title',
      'slug',
      'seoTitle',
      'seoDescription',
      'status',
      'cclType',
      'cclAi',
      'featuredImageId',
      'displayOrder',
    ];
    for (const key of compareKeys) {
      const before = snapshot[key];
      const after = (currentSubpage as unknown as Record<string, unknown>)[key];
      const normalizedBefore = before ?? null;
      const normalizedAfter = after ?? null;
      if (normalizedBefore !== normalizedAfter) {
        rows.push({ field: key as string, before, after });
      }
    }
    return rows;
  }, [versionDetail, currentSubpage]);

  const snapshotBlocks: PageBlockListItem[] =
    versionDetail?.snapshot.blocks.map(snapshotBlockToListItem) ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange} disablePointerDismissal>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>버전 상세</DialogTitle>
          <DialogDescription>
            이 버전 시점의 메모, 메타데이터, 블록 내용을 확인할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        {versionLoading && (
          <div className="space-y-3">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        )}

        {!versionLoading && versionDetail && parsedLabel && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge
                variant={
                  SUBPAGE_VERSION_SOURCE_BADGE_VARIANT[versionDetail.sourceAction]
                }
              >
                {SUBPAGE_VERSION_SOURCE_LABELS[versionDetail.sourceAction]}
              </Badge>
              {versionDetail.isPinned && (
                <Badge variant="outline" className="gap-1">
                  <Pin className="size-3" aria-hidden />
                  고정됨
                </Badge>
              )}
              <span className="text-muted-foreground">
                {format(
                  new Date(versionDetail.createdAt),
                  'yyyy-MM-dd HH:mm:ss',
                )}
                {versionDetail.createdBy
                  ? ` · ${versionDetail.createdBy.name}`
                  : ' · (작성자 없음)'}
              </span>
            </div>

            {/* 메모 섹션 (최상단) */}
            {parsedLabel.subject ? (
              <section className="space-y-2 rounded-md border bg-muted/20 p-4">
                <h3 className="text-lg font-semibold">{parsedLabel.subject}</h3>
                {parsedLabel.hasBody && (
                  <pre className="whitespace-pre-wrap break-words font-sans text-sm text-foreground/80">
                    {parsedLabel.body}
                  </pre>
                )}
              </section>
            ) : (
              <p className="rounded-md border border-dashed bg-muted/10 p-3 text-xs text-muted-foreground">
                {SUBPAGE_VERSION_FALLBACK_TEXT[versionDetail.sourceAction]}
              </p>
            )}

            {/* Dangling media 경고 */}
            {versionDetail.danglingMediaIds.length > 0 && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3">
                <AlertTriangle
                  className="size-4 shrink-0 text-destructive"
                  aria-hidden
                />
                <div className="text-sm">
                  <p className="font-medium text-destructive">
                    누락된 미디어 {versionDetail.danglingMediaIds.length}개
                  </p>
                  <p className="text-xs text-muted-foreground">
                    이 버전이 참조하는 이미지 일부가 현재 미디어 라이브러리에 존재하지 않습니다.
                    복원 시 해당 위치에는 이미지가 표시되지 않을 수 있습니다.
                  </p>
                </div>
              </div>
            )}

            {/* 메타 diff */}
            <section className="space-y-2">
              <h4 className="text-sm font-semibold">메타데이터 비교</h4>
              {metaDiff.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  메타데이터 변경 없음 — 현재와 동일합니다.
                </p>
              ) : (
                <div className="overflow-hidden rounded-md border text-xs">
                  <table className="w-full">
                    <thead className="bg-muted/60">
                      <tr>
                        <th className="p-2 text-left font-medium">필드</th>
                        <th className="p-2 text-left font-medium">이 버전</th>
                        <th className="p-2 text-left font-medium">현재</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metaDiff.map((row) => (
                        <tr key={row.field} className="border-t">
                          <td className="p-2 text-muted-foreground">
                            {META_LABELS[row.field] ?? row.field}
                          </td>
                          <td className="bg-red-50/60 p-2 dark:bg-red-900/20">
                            {formatMetaValue(row.before)}
                          </td>
                          <td className="bg-emerald-50/60 p-2 dark:bg-emerald-900/20">
                            {formatMetaValue(row.after)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* 블록 diff 요약 */}
            {blockSummary && (
              <section className="space-y-2">
                <h4 className="text-sm font-semibold">블록 변경 요약</h4>
                <BlockDiffSummary summary={blockSummary} />
              </section>
            )}

            <Separator />

            {/* 블록 내용 (이 버전) */}
            <section className="space-y-2">
              <h4 className="text-sm font-semibold">
                블록 내용 (이 버전 · {snapshotBlocks.length}개)
              </h4>
              {snapshotBlocks.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  이 버전에는 블록이 없습니다.
                </p>
              ) : (
                <BlockContentView blocks={snapshotBlocks} />
              )}
            </section>
          </div>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <div>
            {versionDetail && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pinPending}
                onClick={() =>
                  togglePin({
                    versionId: versionDetail.id,
                    isPinned: !versionDetail.isPinned,
                  })
                }
              >
                {versionDetail.isPinned ? (
                  <>
                    <PinOff className="size-4" aria-hidden /> 고정 해제
                  </>
                ) : (
                  <>
                    <Pin className="size-4" aria-hidden /> 고정
                  </>
                )}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              닫기
            </Button>
            {versionDetail && (
              <Button
                type="button"
                onClick={() => onRollbackClick(versionDetail.id)}
              >
                <RotateCcw className="size-4" aria-hidden /> 이 버전으로 복원
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
