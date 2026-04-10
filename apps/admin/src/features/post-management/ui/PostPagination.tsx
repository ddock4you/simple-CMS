'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/shared/ui/shadcn/button';

interface PostPaginationProps {
  page: number;
  pageSize: number;
  total: number;
}

export function PostPagination({ page, pageSize, total }: PostPaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const totalPages = Math.ceil(total / pageSize);

  if (totalPages <= 1) return null;

  const navigate = (newPage: number) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.set('page', String(newPage));
    router.push(`/posts?${params.toString()}`);
  };

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        총 {total}건 중 {(page - 1) * pageSize + 1}~
        {Math.min(page * pageSize, total)}건
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(page - 1)}
          disabled={page <= 1}
        >
          <ChevronLeft className="size-4" />
          이전
        </Button>
        <span className="text-sm text-muted-foreground">
          {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(page + 1)}
          disabled={page >= totalPages}
        >
          다음
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
