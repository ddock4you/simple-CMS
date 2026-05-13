'use client';

import { UrlFilterTabs } from '@/shared/ui/UrlFilterTabs';
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
  return (
    <UrlFilterTabs
      options={FILTER_OPTIONS}
      currentValue={currentStatus}
      paramKey="status"
      defaultValue="ALL"
      basePath="/posts"
    />
  );
}
