'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Eye } from 'lucide-react';

import {
  FEEDBACK_POSITIVE_REASONS,
  type FeedbackListItem,
} from '@simple-cms/types';

import { Badge } from '@/shared/ui/shadcn/badge';
import { Button } from '@/shared/ui/Button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/shadcn/table';

import { subpageFeedbackListOptions } from '../api/feedbackQueries';
import type { FeedbackListQuery } from '../model/feedbackFilters';

import { ListSummary } from '@/shared/ui/ListSummary';
import { ListPagination } from '@/shared/ui/ListPagination';
import { FeedbackDetailDialog } from './FeedbackDetailDialog';
import { RatingBadge } from './RatingBadge';

interface FeedbackListTableProps {
  filters: FeedbackListQuery;
}

export function FeedbackListTable({ filters }: FeedbackListTableProps) {
  const { data } = useQuery(subpageFeedbackListOptions(filters));
  const [selected, setSelected] = useState<FeedbackListItem | null>(null);

  if (!data) return null;

  return (
    <div className="space-y-4">
      <ListSummary total={data.total} page={data.page} pageSize={data.pageSize} />
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-40 whitespace-nowrap">시간</TableHead>
              <TableHead>서브페이지</TableHead>
              <TableHead className="w-24">평가</TableHead>
              <TableHead>긍정 이유</TableHead>
              <TableHead>코멘트</TableHead>
              <TableHead className="w-16 text-right">상세</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  피드백이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((item) => (
                <TableRow
                  key={item.id}
                  className="cursor-pointer"
                  onClick={() => setSelected(item)}
                >
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {format(new Date(item.createdAt), 'yyyy-MM-dd HH:mm')}
                  </TableCell>
                  <TableCell className="max-w-[240px]">
                    <span className="block truncate font-medium">
                      {item.subpageTitle}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      /p/{item.subpageSlug}
                    </span>
                  </TableCell>
                  <TableCell>
                    <RatingBadge rating={item.rating} />
                  </TableCell>
                  <TableCell className="max-w-[260px]">
                    {item.rating === 'POSITIVE' &&
                    item.positiveReasons.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {item.positiveReasons.map((reason) => (
                          <Badge
                            key={reason}
                            variant="outline"
                            className="text-xs"
                          >
                            {FEEDBACK_POSITIVE_REASONS[reason]}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[300px]">
                    {item.comment ? (
                      <span className="block truncate text-sm">
                        {item.comment}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(item);
                      }}
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
      <FeedbackDetailDialog
        feedback={selected}
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />
    </div>
  );
}
