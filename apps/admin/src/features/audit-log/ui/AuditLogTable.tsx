'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Eye } from 'lucide-react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/shadcn/table';
import { Button } from '@/shared/ui/Button';

import { ListSummary } from '@/shared/ui/ListSummary';
import { ListPagination } from '@/shared/ui/ListPagination';
import type { AuditLogListFilters, AuditLogListItem } from '../model/auditLogFilters';
import { auditLogListOptions } from '../api/auditLogQueries';
import { AuditActionBadge } from './AuditActionBadge';
import { AuditEntityTypeBadge } from './AuditEntityTypeBadge';
import { AuditLogDetailDialog } from './AuditLogDetailDialog';

interface AuditLogTableProps {
  filters: AuditLogListFilters;
}

export function AuditLogTable({ filters }: AuditLogTableProps) {
  const { data } = useQuery(auditLogListOptions(filters));
  const [selectedItem, setSelectedItem] = useState<AuditLogListItem | null>(null);

  if (!data) return null;

  return (
    <div className="space-y-4">
      <ListSummary total={data.total} page={data.page} pageSize={data.pageSize} />
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>날짜</TableHead>
              <TableHead>사용자</TableHead>
              <TableHead>액션</TableHead>
              <TableHead>대상</TableHead>
              <TableHead>IP</TableHead>
              <TableHead className="text-right">상세</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  감사 로그가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {format(new Date(item.createdAt), 'yyyy-MM-dd HH:mm')}
                  </TableCell>
                  <TableCell>
                    {item.userName ?? '-'}
                  </TableCell>
                  <TableCell>
                    <AuditActionBadge action={item.action} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {item.entityType && (
                        <AuditEntityTypeBadge entityType={item.entityType} />
                      )}
                      <span className="text-sm truncate max-w-[200px]">
                        {item.entityTitle ?? ''}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">
                    {item.ipAddress ?? '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedItem(item)}
                      title="상세 보기"
                    >
                      <Eye className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <ListPagination total={data.total} page={data.page} pageSize={data.pageSize} />
      <AuditLogDetailDialog
        item={selectedItem}
        open={!!selectedItem}
        onOpenChange={(open) => { if (!open) setSelectedItem(null); }}
      />
    </div>
  );
}
