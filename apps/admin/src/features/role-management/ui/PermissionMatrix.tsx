'use client';

import { useState } from 'react';

import { RESOURCE_ACTIONS } from '@simple-cms/types';
import type { ResourceKey, Action } from '@simple-cms/types';

import { Button } from '@/shared/ui/button';
import { useUpdatePermissions } from '@/features/role-management/api/useRoleMutations';

interface PermissionMatrixProps {
  roleId: string;
  permissions: Record<string, Record<string, boolean>>;
  isSystem: boolean;
}

const ACTION_LABELS: Record<Action, string> = {
  create: '생성',
  read: '조회',
  update: '수정',
  delete: '삭제',
};

export function PermissionMatrix({
  roleId,
  permissions,
  isSystem,
}: PermissionMatrixProps) {
  const [local, setLocal] = useState(permissions);
  const updatePermissions = useUpdatePermissions();

  const toggle = (resource: ResourceKey, action: Action) => {
    if (isSystem) return;
    setLocal((prev) => ({
      ...prev,
      [resource]: {
        ...prev[resource],
        [action]: !prev[resource]?.[action],
      },
    }));
  };

  const handleSave = () => {
    updatePermissions.mutate({ id: roleId, permissions: local });
  };

  const handleReset = () => {
    setLocal(permissions);
  };

  const hasChanges = JSON.stringify(local) !== JSON.stringify(permissions);

  const resources = Object.entries(RESOURCE_ACTIONS) as [
    ResourceKey,
    (typeof RESOURCE_ACTIONS)[ResourceKey],
  ][];

  return (
    <div className="space-y-4">
      {isSystem && (
        <p className="text-sm text-muted-foreground">
          총괄 관리자는 모든 권한을 보유하며 수정할 수 없습니다.
        </p>
      )}
      <div className="overflow-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-3 text-left font-medium">리소스</th>
              {(['create', 'read', 'update', 'delete'] as Action[]).map(
                (action) => (
                  <th key={action} className="p-3 text-center font-medium">
                    {ACTION_LABELS[action]}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {resources.map(([resource, config]) => (
              <tr key={resource} className="border-b">
                <td className="p-3 font-medium">{config.name}</td>
                {(['create', 'read', 'update', 'delete'] as Action[]).map(
                  (action) => {
                    const supported = config.actions.includes(action);
                    const checked = isSystem
                      ? supported
                      : !!local[resource]?.[action];

                    return (
                      <td key={action} className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={isSystem || !supported}
                          onChange={() => toggle(resource, action)}
                          className="size-4 rounded border-gray-300"
                        />
                      </td>
                    );
                  },
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!isSystem && (
        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || updatePermissions.isPending}
          >
            {updatePermissions.isPending ? '저장 중...' : '저장'}
          </Button>
          <Button variant="outline" onClick={handleReset} disabled={!hasChanges}>
            취소
          </Button>
        </div>
      )}
    </div>
  );
}
