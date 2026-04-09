'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { roleListFullOptions } from '@/features/role-management/api/roleQueries';
import { RoleList } from '@/features/role-management/ui/RoleList';
import { RoleDetail } from '@/features/role-management/ui/RoleDetail';

export default function RolesPage() {
  const { data: roles } = useQuery(roleListFullOptions());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const effectiveId = selectedId ?? roles?.[0]?.id ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">권한 관리</h1>
        <p className="text-muted-foreground">
          역할을 생성하고 권한을 설정합니다.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <RoleList selectedId={effectiveId} onSelect={setSelectedId} />
        <div className="rounded-md border p-6">
          {effectiveId ? (
            <RoleDetail roleId={effectiveId} />
          ) : (
            <p className="text-muted-foreground">역할을 선택해주세요.</p>
          )}
        </div>
      </div>
    </div>
  );
}
