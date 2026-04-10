'use client';

import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/shared/ui/shadcn/button';
import type { BoardVisibilityFilter as VisibilityFilterType } from '../model/boardFilters';

const FILTER_OPTIONS: { value: VisibilityFilterType; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'PUBLIC', label: '공개' },
  { value: 'PRIVATE', label: '비공개' },
];

interface BoardVisibilityFilterProps {
  currentVisibility: VisibilityFilterType;
}

export function BoardVisibilityFilter({ currentVisibility }: BoardVisibilityFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleFilterChange = (visibility: VisibilityFilterType) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    if (visibility === 'ALL') {
      params.delete('visibility');
    } else {
      params.set('visibility', visibility);
    }
    params.delete('page');
    router.push(`/boards?${params.toString()}`);
  };

  return (
    <div className="flex gap-2">
      {FILTER_OPTIONS.map((option) => (
        <Button
          key={option.value}
          variant={currentVisibility === option.value ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleFilterChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
