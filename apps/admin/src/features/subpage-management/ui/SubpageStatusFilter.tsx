'use client';

import { UrlFilterTabs } from '@/shared/ui/UrlFilterTabs';
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
  return (
    <UrlFilterTabs
      options={FILTER_OPTIONS}
      currentValue={currentStatus}
      paramKey="status"
      defaultValue="ALL"
      basePath="/subpages"
    />
  );
}
