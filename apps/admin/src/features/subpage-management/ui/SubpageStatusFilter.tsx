'use client';

import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/shared/ui/button';
import type { SubpageStatusFilter as StatusFilterType } from '@/features/subpage-management/model/subpageFilters';

const FILTER_OPTIONS: { value: StatusFilterType; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'DRAFT', label: '초안' },
  { value: 'PUBLISHED', label: '발행' },
];

interface SubpageStatusFilterProps {
  currentStatus: StatusFilterType;
}

export function SubpageStatusFilter({ currentStatus }: SubpageStatusFilterProps) {
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
    router.push(`/subpages?${params.toString()}`);
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
