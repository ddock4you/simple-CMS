'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ExternalLink } from 'lucide-react';

import type { FeedbackBySubpageItem } from '@simple-cms/types';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/shadcn/table';

interface FeedbackBySubpageTableProps {
  items: FeedbackBySubpageItem[];
  selectedSubpageId?: string;
}

function formatRate(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

export function FeedbackBySubpageTable({
  items,
  selectedSubpageId,
}: FeedbackBySubpageTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSelect = (subpageId: string) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    if (params.get('subpageId') === subpageId) {
      params.delete('subpageId');
    } else {
      params.set('subpageId', subpageId);
    }
    params.delete('page');
    router.push(`/subpage-feedback?${params.toString()}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">서브페이지별 피드백</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            서브페이지별 데이터가 없습니다.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>서브페이지</TableHead>
                <TableHead className="w-20 text-right">전체</TableHead>
                <TableHead className="w-20 text-right">긍정</TableHead>
                <TableHead className="w-20 text-right">부정</TableHead>
                <TableHead className="w-32">긍정율</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const isSelected = selectedSubpageId === item.subpageId;
                const positivePercent = Math.round(item.positiveRate * 100);
                return (
                  <TableRow
                    key={item.subpageId}
                    className={`cursor-pointer ${isSelected ? 'bg-muted' : ''}`}
                    onClick={() => handleSelect(item.subpageId)}
                  >
                    <TableCell className="max-w-[300px]">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">
                          {item.subpageTitle}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        /p/{item.subpageSlug}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {item.total}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-success">
                      {item.positive}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-destructive">
                      {item.negative}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className="absolute inset-y-0 left-0 bg-success"
                            style={{ width: `${positivePercent}%` }}
                          />
                        </div>
                        <span className="w-10 text-right text-xs tabular-nums">
                          {formatRate(item.positiveRate)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/subpages/${item.subpageId}`}
                        className="inline-flex items-center text-muted-foreground hover:text-foreground"
                        title="서브페이지 상세로 이동"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="size-4" />
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
