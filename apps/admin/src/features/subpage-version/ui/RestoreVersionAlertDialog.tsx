'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { AlertTriangle } from 'lucide-react';

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
import { Checkbox } from '@/shared/ui/shadcn/checkbox';
import { Label } from '@/shared/ui/shadcn/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/shared/ui/Select';

import { subpageVersionDetailOptions } from '../api/versionQueries';
import {
  formatVersionSubject,
  parseVersionLabel,
} from '../lib/parseVersionLabel';
import { SUBPAGE_VERSION_FALLBACK_TEXT } from '../model/versionLabels';
import type { RollbackVersionData } from '../model/versionSchemas';

interface RestoreVersionAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subpageId: string;
  versionId: string | null;
  subpageRevision: number;
  onConfirm: (data: RollbackVersionData) => void;
  isPending: boolean;
}

type StatusStrategy = 'KEEP_CURRENT' | 'APPLY_VERSION';

export function RestoreVersionAlertDialog({
  open,
  onOpenChange,
  subpageId,
  versionId,
  subpageRevision,
  onConfirm,
  isPending,
}: RestoreVersionAlertDialogProps) {
  const [statusStrategy, setStatusStrategy] =
    useState<StatusStrategy>('KEEP_CURRENT');
  const [acknowledged, setAcknowledged] = useState(false);

  const { data: versionDetail } = useQuery({
    ...subpageVersionDetailOptions(subpageId, versionId ?? ''),
    enabled: open && !!versionId,
  });

  const danglingMediaIds = versionDetail?.danglingMediaIds ?? [];
  const hasDangling = danglingMediaIds.length > 0;

  const versionSummary = useMemo(() => {
    if (!versionDetail) return '이 버전의 내용을 불러오는 중…';
    const parsed = parseVersionLabel(versionDetail.label);
    const subject = parsed.subject
      ? formatVersionSubject(parsed.subject)
      : SUBPAGE_VERSION_FALLBACK_TEXT[versionDetail.sourceAction];
    const when = format(
      new Date(versionDetail.createdAt),
      'yyyy-MM-dd HH:mm',
    );
    const who = versionDetail.createdBy?.name ?? '(알 수 없음)';
    return `${when} · ${who} · ${subject}`;
  }, [versionDetail]);

  // 열릴 때마다의 입력 초기화는 부모가 `<RestoreVersionAlertDialog key={versionId}>`로
  // 리마운트시켜 처리한다. useState 기본값이 `'KEEP_CURRENT'` / `false`로 시작.

  const canSubmit =
    !isPending && (!hasDangling || acknowledged);

  const handleConfirm = () => {
    onConfirm({
      expectedRevision: subpageRevision,
      statusStrategy,
      acknowledgeDangling: hasDangling ? acknowledged : undefined,
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>이전 버전으로 복원</AlertDialogTitle>
          <AlertDialogDescription>
            {versionSummary}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            이 버전의 내용으로 현재 서브페이지를 덮어씁니다. 현재 상태는 <b>&quot;복원 직전&quot;</b>
            {' '}버전으로 자동 저장되므로 되돌릴 수 있습니다.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="status-strategy">상태 처리 방식</Label>
            <Select
              value={statusStrategy}
              onValueChange={(v) => setStatusStrategy(v as StatusStrategy)}
            >
              <SelectTrigger id="status-strategy" className="w-full">
                <span>
                  {statusStrategy === 'KEEP_CURRENT'
                    ? '현재 상태 유지 (권장)'
                    : '버전에 저장된 상태 적용'}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="KEEP_CURRENT">현재 상태 유지 (권장)</SelectItem>
                <SelectItem value="APPLY_VERSION">
                  버전에 저장된 상태 적용
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {statusStrategy === 'KEEP_CURRENT'
                ? '본문은 버전 내용으로 복원되지만 발행 상태(DRAFT/PUBLISHED)는 그대로 유지됩니다.'
                : '발행 상태까지 버전 시점으로 되돌립니다. 의도치 않은 발행 전환에 주의하세요.'}
            </p>
          </div>
          {hasDangling && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="size-4 shrink-0 text-destructive" aria-hidden />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-destructive">
                    누락된 미디어 {danglingMediaIds.length}개
                  </p>
                  <p className="text-xs text-muted-foreground">
                    이 버전이 참조하는 이미지 중 현재 라이브러리에서 찾을 수 없는 항목이 있습니다.
                    복원 후 해당 위치에는 이미지가 표시되지 않을 수 있습니다.
                  </p>
                  <label className="flex items-center gap-2 text-xs">
                    <Checkbox
                      checked={acknowledged}
                      onCheckedChange={(next) => setAcknowledged(next === true)}
                    />
                    <span>누락된 이미지를 인지했습니다</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>취소</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!canSubmit}
          >
            {isPending ? '복원 중...' : '이 버전으로 복원'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
