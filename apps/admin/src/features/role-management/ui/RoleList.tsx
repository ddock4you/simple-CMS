'use client';

import { useQuery } from '@tanstack/react-query';
import { Trash2, Star } from 'lucide-react';

import { Button } from '@/shared/ui/shadcn/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/ui/AlertDialog';

import { roleListFullOptions } from '@/features/role-management/api/roleQueries';
import {
  useDeleteRole,
  useSetDefaultRole,
} from '@/features/role-management/api/useRoleMutations';
import { CreateRoleDialog } from '@/features/role-management/ui/CreateRoleDialog';
import { SystemBadge, DefaultBadge } from '@/features/role-management/ui/RoleBadges';

interface RoleListProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function RoleList({ selectedId, onSelect }: RoleListProps) {
  const { data: roles } = useQuery(roleListFullOptions());
  const deleteRole = useDeleteRole();
  const setDefault = useSetDefaultRole();

  if (!roles) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          역할 목록
        </h2>
        <CreateRoleDialog />
      </div>

      <div className="space-y-1">
        {roles.map((role) => (
          <div
            key={role.id}
            className={`cursor-pointer rounded-md border p-3 transition-colors hover:bg-accent ${
              selectedId === role.id ? 'border-primary bg-accent' : ''
            }`}
            onClick={() => onSelect(role.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium">{role.name}</span>
                {role.isSystem && <SystemBadge />}
                {role.isDefault && <DefaultBadge />}
              </div>
              <div className="flex items-center gap-1">
                {!role.isSystem && !role.isDefault && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    title="기본 역할로 설정"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDefault.mutate(role.id);
                    }}
                  >
                    <Star className="size-3" />
                  </Button>
                )}
                {!role.isSystem && !role.isDefault && (
                  <AlertDialog>
                    <AlertDialogTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={(e) => e.stopPropagation()}
                        />
                      }
                    >
                      <Trash2 className="size-3" />
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>역할 삭제</AlertDialogTitle>
                        <AlertDialogDescription>
                          {role.userCount > 0
                            ? `현재 ${role.userCount}명의 사용자가 이 역할을 사용 중입니다. 삭제하면 해당 사용자의 역할이 미배정 상태가 됩니다.`
                            : '이 역할을 삭제하시겠습니까?'}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteRole.mutate(role.id)}
                        >
                          삭제
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
            {role.description && (
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {role.description}
              </p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              할당: {role.userCount}명
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
