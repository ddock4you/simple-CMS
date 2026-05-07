import { Badge } from '@/shared/ui/Badge';

import type { BlockDiffSummary as Summary } from '../lib/summarizeBlockDiff';

export function BlockDiffSummary({ summary }: { summary: Summary }) {
  const hasAnyChange =
    summary.added > 0 || summary.removed > 0 || summary.modified > 0;

  if (!hasAnyChange) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        블록 변경 없음 · {summary.unchanged}개 유지
      </Badge>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      {summary.added > 0 && (
        <Badge variant="success">
          +추가 {summary.added}
        </Badge>
      )}
      {summary.removed > 0 && (
        <Badge variant="destructive">-삭제 {summary.removed}</Badge>
      )}
      {summary.modified > 0 && (
        <Badge variant="warning">
          ~수정 {summary.modified}
        </Badge>
      )}
      {summary.unchanged > 0 && (
        <span className="text-muted-foreground">
          · {summary.unchanged}개 유지
        </span>
      )}
    </div>
  );
}
