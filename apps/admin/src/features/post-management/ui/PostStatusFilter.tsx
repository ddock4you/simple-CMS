'use client';

import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/shared/ui/shadcn/button';
import type { PostStatusFilter as StatusFilterType } from '../model/postFilters';

const FILTER_OPTIONS: { value: StatusFilterType; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'DRAFT', label: '초안' },
  { value: 'PUBLISHED', label: '발행' },
];

interface PostStatusFilterProps {
  currentStatus: StatusFilterType;
}

export function PostStatusFilter({ currentStatus }: PostStatusFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleFilterChange = (status: StatusFilterType) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    if (status === 'ALL') {
      params.delete('status');
    } else {
      params.set('status', status);
    }
    params.delete('page');
    router.push(`/posts?${params.toString()}`);
  };

  return (
    <div className="flex gap-2">
      {FILTER_OPTIONS.map((option) => (
        <Button
          key={option.value}
          variant={currentStatus === option.value ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleFilterChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
