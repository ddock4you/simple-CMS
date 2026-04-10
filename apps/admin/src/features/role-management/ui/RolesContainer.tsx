'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { roleListFullOptions } from '@/features/role-management/api/roleQueries';
import { RoleList } from '@/features/role-management/ui/RoleList';
import { RoleDetail } from '@/features/role-management/ui/RoleDetail';

export function RolesContainer() {
  const { data: roles } = useQuery(roleListFullOptions());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const effectiveId = selectedId ?? roles?.[0]?.id ?? null;

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <RoleList selectedId={effectiveId} onSelect={setSelectedId} />
      <div className="rounded-md border p-6">
        {effectiveId ? (
          <RoleDetail key={effectiveId} roleId={effectiveId} />
        ) : (
          <p className="text-muted-foreground">역할을 선택해주세요.</p>
        )}
      </div>
    </div>
  );
}
