'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

import { usePermission } from '@/entities/auth/ui/PermissionProvider';
import { Button } from '@/shared/ui/shadcn/button';

type RatingFilter = 'ALL' | 'POSITIVE' | 'NEGATIVE';

interface FeedbackExportProps {
  from?: string | null;
  to?: string | null;
  rating?: RatingFilter;
  subpageId?: string | null;
  q?: string | null;
}

export function FeedbackExport({
  from,
  to,
  rating = 'ALL',
  subpageId,
  q,
}: FeedbackExportProps) {
  const canExport = usePermission('subpage-feedback', 'read');
  const [isExporting, setIsExporting] = useState(false);

  if (!canExport) return null;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (rating && rating !== 'ALL') params.set('rating', rating);
      if (subpageId) params.set('subpageId', subpageId);
      if (q) params.set('q', q);

      const qs = params.toString();
      const response = await fetch(
        qs
          ? `/api/subpage-feedback/export?${qs}`
          : '/api/subpage-feedback/export',
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '내보내기에 실패했습니다.');
      }

      const filename = parseFilenameFromHeader(
        response.headers.get('Content-Disposition'),
      );
      const rowCount = Number(response.headers.get('X-Row-Count') ?? '0');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename ?? 'subpage-feedback.xlsx';
      a.click();
      URL.revokeObjectURL(url);

      if (rowCount === 0) {
        toast.info('선택한 기간에 피드백이 없습니다. 빈 파일이 다운로드되었습니다.');
      } else {
        toast.success(`사용자 피드백 ${rowCount}건이 다운로드되었습니다.`);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : '내보내기에 실패했습니다.',
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={isExporting}
    >
      <Download className="size-4" />
      {isExporting ? '내보내기 중...' : 'Excel 다운로드'}
    </Button>
  );
}

function parseFilenameFromHeader(header: string | null): string | null {
  if (!header) return null;
  const match = header.match(/filename="?([^";]+)"?/i);
  return match ? match[1] : null;
}
