'use client';

import { UrlFilterTabs } from '@/shared/ui/UrlFilterTabs';
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
  return (
    <UrlFilterTabs
      options={FILTER_OPTIONS}
      currentValue={currentVisibility}
      paramKey="visibility"
      defaultValue="ALL"
      basePath="/boards"
    />
  );
}
