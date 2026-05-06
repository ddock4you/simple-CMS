'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Check, Eye } from 'lucide-react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/shadcn/table';
import { Button } from '@/shared/ui/shadcn/button';
import { Badge } from '@/shared/ui/shadcn/badge';

import { ListSummary } from '@/shared/ui/ListSummary';
import { ListPagination } from '@/shared/ui/ListPagination';
import { errorLogListOptions } from '../api/errorLogQueries';
import type { ErrorLogListFilters } from '../model/errorLogFilters';
import { BulkResolveButton } from './BulkResolveButton';
import { ErrorLevelBadge } from './ErrorLevelBadge';
import { ErrorLogDetailDialog } from './ErrorLogDetailDialog';
import { ErrorSourceBadge } from './ErrorSourceBadge';

interface ErrorLogTableProps {
  filters: ErrorLogListFilters;
}

export function ErrorLogTable({ filters }: ErrorLogTableProps) {
  const { data } = useQuery(errorLogListOptions(filters));
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {filters.groupByFingerprint ? (
              <TableRow>
                <TableHead>최근 발생</TableHead>
                <TableHead>레벨</TableHead>
                <TableHead>소스</TableHead>
                <TableHead>메시지</TableHead>
                <TableHead>URL</TableHead>
                <TableHead className="text-right">발생 횟수</TableHead>
                <TableHead className="text-right">액션</TableHead>
              </TableRow>
            ) : (
              <TableRow>
                <TableHead>시간</TableHead>
                <TableHead>레벨</TableHead>
                <TableHead>소스</TableHead>
                <TableHead>메시지</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>상태</TableHead>
                <TableHead className="text-right">상세</TableHead>
              </TableRow>
            )}
          </TableHeader>
          <TableBody>
            {data.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  에러 로그가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((item) => {
                if (item.kind === 'group') {
                  return (
                    <TableRow key={`group-${item.fingerprint}`}>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {format(
                          new Date(item.latestCreatedAt),
                          'yyyy-MM-dd HH:mm',
                        )}
                      </TableCell>
                      <TableCell>
                        <ErrorLevelBadge level={item.level} />
                      </TableCell>
                      <TableCell>
                        <ErrorSourceBadge source={item.source} />
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        <span className="block truncate">
                          {item.latestMessage}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs max-w-[200px]">
                        <span className="block truncate">
                          {item.latestUrl ?? '-'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {item.count.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <BulkResolveButton
                            fingerprint={item.fingerprint}
                            count={item.count}
                            hasUnresolved={item.hasUnresolved}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedId(item.latestId)}
                            title="대표 상세"
                          >
                            <Eye className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                }

                // individual
                return (
                  <TableRow key={item.id}>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {format(new Date(item.createdAt), 'yyyy-MM-dd HH:mm')}
                    </TableCell>
                    <TableCell>
                      <ErrorLevelBadge level={item.level} />
                    </TableCell>
                    <TableCell>
                      <ErrorSourceBadge source={item.source} />
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      <span className="block truncate">{item.message}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs max-w-[200px]">
                      <span className="block truncate">
                        {item.url ?? '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {item.isResolved ? (
                        <Badge variant="outline">
                          <Check className="size-3" />
                          해결
                        </Badge>
                      ) : (
                        <Badge variant="secondary">미해결</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedId(item.id)}
                        title="상세 보기"
                      >
                        <Eye className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between">
        <ListSummary total={data.total} page={data.page} pageSize={data.pageSize} />
        <ListPagination total={data.total} page={data.page} pageSize={data.pageSize} />
      </div>
      <ErrorLogDetailDialog
        id={selectedId}
        open={!!selectedId}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      />
    </div>
  );
}
