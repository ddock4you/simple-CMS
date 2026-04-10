'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/shared/ui/shadcn/button';

import { DatePicker } from './DatePicker';

export function AuditLogExport() {
  const [from, setFrom] = useState<Date | undefined>();
  const [to, setTo] = useState<Date | undefined>();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!from || !to) {
      toast.error('내보내기할 날짜 범위를 선택해주세요.');
      return;
    }

    setIsExporting(true);
    try {
      const fromStr = from.toISOString().slice(0, 10);
      const toStr = to.toISOString().slice(0, 10);

      const response = await fetch(
        `/api/audit-logs/export?from=${fromStr}&to=${toStr}`,
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '내보내기에 실패했습니다.');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${fromStr}-${toStr}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('감사 로그가 다운로드되었습니다.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '내보내기에 실패했습니다.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <DatePicker value={from} onChange={setFrom} placeholder="시작일" />
      <span className="text-muted-foreground">~</span>
      <DatePicker value={to} onChange={setTo} placeholder="종료일" />
      <Button
        variant="outline"
        size="sm"
        onClick={handleExport}
        disabled={isExporting || !from || !to}
      >
        <Download className="size-4" />
        {isExporting ? '내보내기 중...' : 'Excel'}
      </Button>
    </div>
  );
}
