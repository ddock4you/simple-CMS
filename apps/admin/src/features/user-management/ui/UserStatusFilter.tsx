'use client';

import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/shared/ui/Button';
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
    router.push(`/users?${params.toString()}`);
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
