'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/shadcn/dialog';
import { Button } from '@/shared/ui/Button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/shared/ui/Select';

import { roleListOptions } from '../api/userQueries';
import { useBulkChangeUserRole } from '../api/useUserMutations';
import type { BulkUserUpdateResult } from '../api/userFetchers';

interface Props {
  ids: string[];
  isCurrentUserSystemAdmin: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted?: (result: BulkUserUpdateResult) => void;
}

type Phase =
  | { kind: 'select' }
  | { kind: 'result'; result: BulkUserUpdateResult };

export function BulkChangeUserRoleDialog({
  ids,
  isCurrentUserSystemAdmin,
  open,
  onOpenChange,
  onCompleted,
}: Props) {
  const [phase, setPhase] = useState<Phase>({ kind: 'select' });
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');

  const { data: roles } = useQuery({ ...roleListOptions(), enabled: open });

  const visibleRoles = (roles ?? []).filter(
    (r) => isCurrentUserSystemAdmin || !r.isSystem,
  );

  const bulkChangeRole = useBulkChangeUserRole({
    onSuccess: (result) => {
      if (result.blocked.length > 0) {
        setPhase({ kind: 'result', result });
      } else {
        onOpenChange(false);
        onCompleted?.(result);
        resetState();
      }
    },
  });

  const resetState = () => {
    setTimeout(() => {
      setPhase({ kind: 'select' });
      setSelectedRoleId('');
    }, 100);
  };

  const handleConfirm = () => {
    if (!selectedRoleId || ids.length === 0) return;
    bulkChangeRole.mutate({ ids, roleId: selectedRoleId });
  };

  const handleClose = () => {
    onOpenChange(false);
    if (phase.kind === 'result') onCompleted?.(phase.result);
    resetState();
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) handleClose();
    else onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} disablePointerDismissal>
      <DialogContent size="sm">
        {phase.kind === 'select' ? (
          <>
            <DialogHeader>
              <DialogTitle>일괄 역할 변경</DialogTitle>
              <DialogDescription>
                선택한 {ids.length}명의 역할을 변경합니다.
              </DialogDescription>
            </DialogHeader>
            <div className="py-2">
              <Select value={selectedRoleId} onValueChange={(v) => setSelectedRoleId(v ?? '')}>
                <SelectTrigger>
                  <span>
                    {selectedRoleId
                      ? (visibleRoles.find((r) => r.id === selectedRoleId)?.name ?? '역할 선택')
                      : '역할 선택'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {visibleRoles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={bulkChangeRole.isPending}
              >
                취소
              </Button>
              <Button
                type="button"
                onClick={handleConfirm}
                disabled={!selectedRoleId || bulkChangeRole.isPending}
              >
                {bulkChangeRole.isPending ? '처리 중...' : `${ids.length}명 역할 변경`}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>일괄 역할 변경 결과</DialogTitle>
              <DialogDescription>
                {phase.result.updated.length}명 변경 완료,{' '}
                {phase.result.blocked.length}명은 처리되지 않았습니다.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm font-medium">처리되지 않은 사용자</p>
              <ul className="max-h-64 space-y-2 overflow-y-auto rounded-md border bg-muted/30 p-2 text-sm">
                {phase.result.blocked.map((item) => (
                  <li
                    key={item.id}
                    className="space-y-0.5 border-b pb-2 last:border-b-0 last:pb-0"
                  >
                    <p className="font-medium">{item.username}</p>
                    <p className="pl-3 text-xs text-muted-foreground">· {item.reason}</p>
                  </li>
                ))}
              </ul>
            </div>
            <DialogFooter>
              <Button type="button" onClick={handleClose}>
                확인
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
