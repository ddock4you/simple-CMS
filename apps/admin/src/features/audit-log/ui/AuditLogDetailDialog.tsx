'use client';

import { format } from 'date-fns';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/shadcn/dialog';

import type { AuditLogListItem } from '../model/auditLogFilters';
import { AuditActionBadge } from './AuditActionBadge';
import { AuditEntityTypeBadge } from './AuditEntityTypeBadge';

interface AuditLogDetailDialogProps {
  item: AuditLogListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuditLogDetailDialog({
  item,
  open,
  onOpenChange,
}: AuditLogDetailDialogProps) {
  if (!item) return null;

  const changes = item.changes as Record<string, unknown> | null;
  const before = changes?.before as Record<string, unknown> | undefined;
  const after = changes?.after as Record<string, unknown> | undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>감사 로그 상세</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">날짜</span>
              <p>{format(new Date(item.createdAt), 'yyyy-MM-dd HH:mm:ss')}</p>
            </div>
            <div>
              <span className="text-muted-foreground">사용자</span>
              <p>{item.userName ?? '-'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">액션</span>
              <div className="mt-1"><AuditActionBadge action={item.action} /></div>
            </div>
            <div>
              <span className="text-muted-foreground">대상</span>
              <div className="mt-1">
                {item.entityType && <AuditEntityTypeBadge entityType={item.entityType} />}
                {!item.entityType && <span>-</span>}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">대상 제목</span>
              <p>{item.entityTitle ?? '-'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">IP</span>
              <p className="font-mono text-xs">{item.ipAddress ?? '-'}</p>
            </div>
          </div>

          {item.userAgent && (
            <div className="text-sm">
              <span className="text-muted-foreground">User Agent</span>
              <p className="text-xs text-muted-foreground mt-1 break-all">{item.userAgent}</p>
            </div>
          )}

          {changes && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">변경 내용</h4>

              {before && (
                <div className="rounded-md bg-destructive/10 p-3">
                  <span className="text-xs font-medium text-destructive">이전</span>
                  <div className="mt-1 space-y-1">
                    {Object.entries(before).map(([key, value]) => (
                      <div key={key} className="flex gap-2 text-sm">
                        <span className="text-muted-foreground min-w-[80px]">{key}:</span>
                        <span>{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {after && (
                <div className="rounded-md bg-success/10 p-3">
                  <span className="text-xs font-medium text-success">이후</span>
                  <div className="mt-1 space-y-1">
                    {Object.entries(after).map(([key, value]) => (
                      <div key={key} className="flex gap-2 text-sm">
                        <span className="text-muted-foreground min-w-[80px]">{key}:</span>
                        <span>{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!before && !after && (
                <p className="text-sm text-muted-foreground">변경 내용 없음</p>
              )}
            </div>
          )}

          {!changes && (
            <p className="text-sm text-muted-foreground">변경 내용 없음</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
