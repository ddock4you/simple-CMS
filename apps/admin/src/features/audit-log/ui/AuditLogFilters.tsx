'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import type { AuditAction, AuditEntityType } from '@simple-cms/db';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/shared/ui/shadcn/select';

import { toKstDateString } from '@/shared/lib/kstDate';
import { userOptionsQuery } from '../api/auditLogQueries';
import { ACTION_LABELS, ENTITY_TYPE_LABELS } from '../model/auditLogFilters';
import type { AuditActionFilter } from '../model/auditLogFilters';
import { DatePicker } from '@/shared/ui/DatePicker';

interface AuditLogFiltersProps {
  currentAction: AuditActionFilter;
  currentEntityType: string | null;
  currentUserId: string | null;
  currentFrom: string | null;
  currentTo: string | null;
}

export function AuditLogFilters({
  currentAction,
  currentEntityType,
  currentUserId,
  currentFrom,
  currentTo,
}: AuditLogFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: users } = useQuery(userOptionsQuery());

  const updateParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    if (!value || value === 'ALL') {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.delete('page');
    router.push(`/audit-logs?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <DatePicker
        value={currentFrom ? new Date(currentFrom) : undefined}
        onChange={(date) => updateParam('from', date ? toKstDateString(date) : null)}
        placeholder="시작일"
      />
      <span className="text-muted-foreground">~</span>
      <DatePicker
        value={currentTo ? new Date(currentTo) : undefined}
        onChange={(date) => updateParam('to', date ? toKstDateString(date) : null)}
        placeholder="종료일"
      />

      <Select
        value={currentAction}
        onValueChange={(v) => updateParam('action', v)}
      >
        <SelectTrigger className="w-[120px]">
          <span>
            {currentAction === 'ALL' ? '전체 액션' : ACTION_LABELS[currentAction as AuditAction]}
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">전체 액션</SelectItem>
          {(Object.keys(ACTION_LABELS) as AuditAction[]).map((action) => (
            <SelectItem key={action} value={action}>
              {ACTION_LABELS[action]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={currentEntityType ?? 'ALL'}
        onValueChange={(v) => updateParam('entityType', v)}
      >
        <SelectTrigger className="w-[140px]">
          <span>
            {currentEntityType
              ? ENTITY_TYPE_LABELS[currentEntityType as AuditEntityType] ?? currentEntityType
              : '전체 대상'}
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">전체 대상</SelectItem>
          {(Object.keys(ENTITY_TYPE_LABELS) as AuditEntityType[]).map((type) => (
            <SelectItem key={type} value={type}>
              {ENTITY_TYPE_LABELS[type]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={currentUserId ?? 'ALL'}
        onValueChange={(v) => updateParam('userId', v)}
      >
        <SelectTrigger className="w-[130px]">
          <span>
            {currentUserId
              ? users?.find((u) => u.id === currentUserId)?.name ?? '사용자'
              : '전체 사용자'}
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">전체 사용자</SelectItem>
          {users?.map((user) => (
            <SelectItem key={user.id} value={user.id}>
              {user.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
