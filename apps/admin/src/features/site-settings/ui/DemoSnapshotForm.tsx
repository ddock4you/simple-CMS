'use client';

/**
 * 시연 스냅샷 관리 Client Form (PR7).
 *
 * - StatCard로 16모델 row count + Media 합계 사이즈 미리보기
 * - [내보내기] — GET /api/demo/snapshot/export → blob download
 * - [Supabase 즉시 적용] — file input → POST /api/demo/snapshot/import →
 *   AlertDialog confirm → 결과 toast + router.refresh
 *
 * 운영 환경(`DEMO_MODE !== 'true'`)에서는 import 버튼을 시각적으로 비활성화 + 안내 표시.
 * 권한 게이팅: canExport / canImport prop으로 버튼 자체 숨김.
 */
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Database,
  FileText,
  Image as ImageIcon,
  HardDrive,
  Upload,
  Download,
} from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/AlertDialog';
import { Button } from '@/shared/ui/Button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import { StatCard } from '@/shared/ui/layout/StatCard';
import { resolveAdminApiPath } from '@/shared/api/fetchClient';

interface ImportStatsShape {
  rowsCreatedByModel: Record<string, number>;
  mediaFilesUploaded: number;
  storageFilesDeleted: number;
  rowsDeletedByModel: Record<string, number>;
  errors: string[];
}

interface DemoSnapshotFormProps {
  stats: {
    rowCounts: Record<string, number>;
    totalRows: number;
    mediaSizeBytes: number;
  };
  canExport: boolean;
  canImport: boolean;
  isDemoMode: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 2)} ${sizes[i]}`;
}

export function DemoSnapshotForm({
  stats,
  canExport,
  canImport,
  isDemoMode,
}: DemoSnapshotFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportStatsShape | null>(null);

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const res = await fetch(resolveAdminApiPath('/api/demo/snapshot/export'), {
        method: 'GET',
        credentials: 'same-origin',
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        toast.error(body?.error ?? '스냅샷 내보내기 실패');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cd = res.headers.get('content-disposition') ?? '';
      const match = cd.match(/filename="([^"]+)"/);
      a.download = match?.[1] ?? `demo-snapshot-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      const totalRows = res.headers.get('x-snapshot-total-rows');
      const sizeBytes = Number(res.headers.get('x-snapshot-size-bytes') ?? 0);
      toast.success(
        `스냅샷 내보내기 완료${
          totalRows ? ` (${totalRows} row, ${formatBytes(sizeBytes)})` : ''
        }`,
      );
    } catch (err) {
      console.error('[DemoSnapshotForm] export error', err);
      toast.error('스냅샷 내보내기 중 네트워크 오류');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelected = (file: File | null) => {
    if (!file) return;
    if (!file.name.endsWith('.json')) {
      toast.error('.json 파일만 업로드 가능합니다.');
      return;
    }
    setPendingFile(file);
    setConfirmOpen(true);
  };

  const handleImportConfirm = async () => {
    if (!pendingFile || isImporting) return;
    setIsImporting(true);
    setImportResult(null);
    try {
      const text = await pendingFile.text();
      const res = await fetch(resolveAdminApiPath('/api/demo/snapshot/import'), {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: text,
      });
      const json = (await res.json().catch(() => null)) as
        | { success: boolean; data?: { stats: ImportStatsShape }; error?: string }
        | null;
      if (!res.ok || !json?.success || !json.data) {
        toast.error(json?.error ?? '스냅샷 적용 실패');
        return;
      }
      setImportResult(json.data.stats);
      const total = Object.values(json.data.stats.rowsCreatedByModel).reduce(
        (sum, n) => sum + n,
        0,
      );
      toast.success(
        `시연 시드 갱신 완료 (${total} row, ${json.data.stats.mediaFilesUploaded} files)`,
      );
      setConfirmOpen(false);
      setPendingFile(null);
      router.refresh();
    } catch (err) {
      console.error('[DemoSnapshotForm] import error', err);
      toast.error('스냅샷 적용 중 네트워크 오류');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 미리보기 통계 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="총 row 수"
          value={stats.totalRows}
          description="16모델 합계"
          icon={Database}
        />
        <StatCard
          title="서브페이지"
          value={stats.rowCounts.Subpage ?? 0}
          description={`PageBlock ${stats.rowCounts.PageBlock ?? 0}`}
          icon={FileText}
        />
        <StatCard
          title="Media"
          value={stats.rowCounts.Media ?? 0}
          description={formatBytes(stats.mediaSizeBytes)}
          icon={ImageIcon}
        />
        <StatCard
          title="버전 스냅샷"
          value={stats.rowCounts.SubpageVersion ?? 0}
          description={`로그 ${((stats.rowCounts.AuditLog ?? 0) + (stats.rowCounts.ErrorLog ?? 0)).toLocaleString('ko-KR')}`}
          icon={HardDrive}
        />
      </div>

      {/* 모델별 상세 row count */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            모델별 row 수 (운영 sentinel <code>__PROD__</code>)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 text-sm">
            {Object.entries(stats.rowCounts).map(([model, count]) => (
              <div
                key={model}
                className="flex justify-between border-b border-dashed border-border/40 py-1"
              >
                <dt className="text-muted-foreground">{model}</dt>
                <dd className="font-medium tabular-nums">{count}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      {/* 액션 버튼 */}
      <div className="flex flex-wrap gap-2">
        {canExport && (
          <Button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="gap-2"
          >
            <Download className="size-4" />
            {isExporting ? '내보내는 중…' : '스냅샷 내보내기'}
          </Button>
        )}
        {canImport && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                handleFileSelected(file);
                // 같은 파일 재선택 가능하도록 reset
                if (e.target) e.target.value = '';
              }}
            />
            <Button
              type="button"
              variant="outline"
              disabled={!isDemoMode || isImporting}
              onClick={() => fileInputRef.current?.click()}
              className="gap-2"
              title={
                isDemoMode
                  ? undefined
                  : 'DEMO_MODE=true 시연 환경에서만 동작합니다.'
              }
            >
              <Upload className="size-4" />
              Supabase에 즉시 적용
            </Button>
          </>
        )}
      </div>

      {!isDemoMode && canImport && (
        <p className="text-xs text-muted-foreground">
          현재 환경은 운영 모드(<code>DEMO_MODE</code> 미설정)이므로 [Supabase에
          즉시 적용]은 비활성화됩니다. 시연 환경에서 사용하거나 CLI(<code>pnpm
          demo:import</code>)를 이용하세요.
        </p>
      )}

      {/* import 결과 */}
      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">최근 적용 결과</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              생성된 row:{' '}
              <span className="font-medium tabular-nums">
                {Object.values(importResult.rowsCreatedByModel).reduce(
                  (sum, n) => sum + n,
                  0,
                )}
              </span>
            </p>
            <p>
              업로드된 미디어 파일:{' '}
              <span className="font-medium tabular-nums">
                {importResult.mediaFilesUploaded}
              </span>
            </p>
            <p>
              정리된 기존 시드 파일:{' '}
              <span className="font-medium tabular-nums">
                {importResult.storageFilesDeleted}
              </span>
            </p>
            {importResult.errors.length > 0 && (
              <details className="mt-3">
                <summary className="cursor-pointer text-warning-foreground">
                  ⚠ 부분 실패 {importResult.errors.length}건 (펼쳐서 확인)
                </summary>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {importResult.errors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </details>
            )}
          </CardContent>
        </Card>
      )}

      {/* AlertDialog confirm */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent size="default">
          <AlertDialogHeader>
            <AlertDialogTitle>시연 시드를 새 스냅샷으로 갱신할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              기존 <code>__SEED__</code> row와 Storage 파일이 모두 삭제되고 업로드한
              스냅샷으로 대체됩니다. 이미 진입한 visitor는 영향을 받지 않으며 다음
              방문자부터 새 시드로 시작합니다.
              <br />
              파일: <strong>{pendingFile?.name}</strong> (
              {pendingFile ? formatBytes(pendingFile.size) : ''})
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isImporting}
              onClick={() => {
                setPendingFile(null);
              }}
            >
              취소
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleImportConfirm} disabled={isImporting}>
              {isImporting ? '적용 중…' : '적용'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
