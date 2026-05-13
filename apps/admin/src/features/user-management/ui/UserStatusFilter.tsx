'use client';

import { UrlFilterTabs } from '@/shared/ui/UrlFilterTabs';
import type { UserStatusFilter as StatusFilterType } from '@/features/user-management/model/userFilters';

const FILTER_OPTIONS: { value: StatusFilterType; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'PENDING', label: '대기' },
  { value: 'ACTIVE', label: '활성' },
  { value: 'SUSPENDED', label: '정지' },
];

interface UserStatusFilterProps {
  currentStatus: StatusFilterType;
}

export function UserStatusFilter({ currentStatus }: UserStatusFilterProps) {
  return (
    <UrlFilterTabs
      options={FILTER_OPTIONS}
      currentValue={currentStatus}
      paramKey="status"
      defaultValue="ALL"
      basePath="/users"
    />
  );
}
