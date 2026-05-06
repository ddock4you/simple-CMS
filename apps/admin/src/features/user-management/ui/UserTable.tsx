'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { CheckSquare, ShieldBan, ShieldCheck, Trash2, UserCheck } from 'lucide-react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/shadcn/table';
import { Checkbox } from '@/shared/ui/shadcn/checkbox';
import { BulkActionBar } from '@/shared/ui/BulkActionBar';
import { usePermission } from '@/entities/auth/ui/PermissionProvider';
import { ListSummary } from '@/shared/ui/ListSummary';
import { ListPagination } from '@/shared/ui/ListPagination';
import type { UserListFilters } from '@/features/user-management/model/userFilters';
import { userListOptions } from '@/features/user-management/api/userQueries';
import { UserStatusBadge } from '@/features/user-management/ui/UserStatusBadge';
import { UserRoleBadge } from '@/features/user-management/ui/UserRoleBadge';
import { UserActionButtons } from '@/features/user-management/ui/UserActionButtons';
import { UserRoleSelect } from '@/features/user-management/ui/UserRoleSelect';
import { BulkApproveUserDialog } from './BulkApproveUserDialog';
import { BulkRejectUserDialog } from './BulkRejectUserDialog';
import { BulkSuspendUserDialog } from './BulkSuspendUserDialog';
import { BulkReactivateUserDialog } from './BulkReactivateUserDialog';
import { BulkChangeUserRoleDialog } from './BulkChangeUserRoleDialog';

interface UserTableProps {
  filters: UserListFilters;
  currentUserId: string;
  isCurrentUserSystemAdmin: boolean;
}

export function UserTable({
  filters,
  currentUserId,
  isCurrentUserSystemAdmin,
}: UserTableProps) {
  const { data } = useQuery(userListOptions(filters));
  const canUpdateUsers = usePermission('users', 'update');
  const canDeleteUsers = usePermission('users', 'delete');

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkApproveOpen, setBulkApproveOpen] = useState(false);
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);
  const [bulkSuspendOpen, setBulkSuspendOpen] = useState(false);
  const [bulkReactivateOpen, setBulkReactivateOpen] = useState(false);
  const [bulkRoleOpen, setBulkRoleOpen] = useState(false);

  const pageIds = useMemo(() => data?.items.map((item) => item.id) ?? [], [data]);

  const selectedOnPage = useMemo(
    () => pageIds.filter((id) => selectedIds.has(id)),
    [pageIds, selectedIds],
  );

  const isAllOnPageSelected = pageIds.length > 0 && selectedOnPage.length === pageIds.length;
  const isIndeterminate = selectedOnPage.length > 0 && selectedOnPage.length < pageIds.length;

  if (!data) return null;

  const toggleAll = (next: boolean) => {
    setSelectedIds((prev) => {
      const updated = new Set(prev);
      for (const id of pageIds) {
        if (next) updated.add(id);
        else updated.delete(id);
      }
      return updated;
    });
  };

  const toggleOne = (id: string, next: boolean) => {
    setSelectedIds((prev) => {
      const updated = new Set(prev);
      if (next) updated.add(id);
      else updated.delete(id);
      return updated;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());
  const selectedArray = Array.from(selectedIds);

  const showBulk = canUpdateUsers || canDeleteUsers;

  const selectedStatuses = useMemo(() => {
    const statuses = new Set(
      data.items
        .filter((u) => selectedIds.has(u.id))
        .map((u) => u.status),
    );
    return statuses;
  }, [data.items, selectedIds]);

  const allPending = selectedStatuses.size === 1 && selectedStatuses.has('PENDING');
  const allActive = selectedStatuses.size === 1 && selectedStatuses.has('ACTIVE');
  const allSuspended = selectedStatuses.size === 1 && selectedStatuses.has('SUSPENDED');
  const isMixed = selectedStatuses.size > 1;

  const bulkActions = useMemo(() => {
    if (selectedIds.size === 0) return [];
    const actions = [];

    if (canUpdateUsers && (allPending || isMixed)) {
      actions.push({
        key: 'approve',
        label: '일괄 승인',
        icon: <UserCheck className="size-4" />,
        onClick: () => setBulkApproveOpen(true),
      });
    }
    if (canDeleteUsers && (allPending || isMixed)) {
      actions.push({
        key: 'reject',
        label: '일괄 거절',
        icon: <Trash2 className="size-4" />,
        variant: 'destructive' as const,
        onClick: () => setBulkRejectOpen(true),
      });
    }
    if (canUpdateUsers && (allActive || isMixed)) {
      actions.push({
        key: 'suspend',
        label: '일괄 정지',
        icon: <ShieldBan className="size-4" />,
        variant: 'destructive' as const,
        onClick: () => setBulkSuspendOpen(true),
      });
    }
    if (canUpdateUsers && (allActive || isMixed)) {
      actions.push({
        key: 'role',
        label: '일괄 역할 변경',
        icon: <CheckSquare className="size-4" />,
        onClick: () => setBulkRoleOpen(true),
      });
    }
    if (canUpdateUsers && (allSuspended || isMixed)) {
      actions.push({
        key: 'reactivate',
        label: '일괄 활성화',
        icon: <ShieldCheck className="size-4" />,
        onClick: () => setBulkReactivateOpen(true),
      });
    }

    return actions;
  }, [selectedIds.size, allPending, allActive, allSuspended, isMixed, canUpdateUsers, canDeleteUsers]);

  return (
    <div className="space-y-4">
      {showBulk && (
        <BulkActionBar
          selectedCount={selectedIds.size}
          totalOnPage={pageIds.length}
          isAllOnPageSelected={isAllOnPageSelected}
          isIndeterminate={isIndeterminate}
          onToggleAll={toggleAll}
          onClear={clearSelection}
          actions={bulkActions}
        />
      )}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {showBulk && <TableHead className="w-12" />}
              <TableHead>아이디</TableHead>
              <TableHead>이름</TableHead>
              <TableHead>역할</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>가입일</TableHead>
              <TableHead className="text-right">액션</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showBulk ? 7 : 6} className="h-24 text-center">
                  사용자가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((user) => (
                <TableRow key={user.id}>
                  {showBulk && (
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(user.id)}
                        onCheckedChange={(c) => toggleOne(user.id, c === true)}
                        aria-label={`${user.username} 선택`}
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>
                    {user.status === 'ACTIVE' && canUpdateUsers ? (
                      <UserRoleSelect
                        userId={user.id}
                        currentRoleId={user.role?.id ?? null}
                        isCurrentUserSystemAdmin={isCurrentUserSystemAdmin}
                      />
                    ) : (
                      <UserRoleBadge role={user.role} />
                    )}
                  </TableCell>
                  <TableCell>
                    <UserStatusBadge status={user.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(user.createdAt), 'yyyy-MM-dd')}
                  </TableCell>
                  <TableCell className="text-right">
                    <UserActionButtons
                      userId={user.id}
                      status={user.status}
                      isSelf={user.id === currentUserId}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between">
        <ListSummary total={data.total} page={data.page} pageSize={data.pageSize} />
        <ListPagination total={data.total} page={data.page} pageSize={data.pageSize} />
      </div>

      <BulkApproveUserDialog
        ids={selectedArray}
        open={bulkApproveOpen}
        onOpenChange={setBulkApproveOpen}
        onCompleted={(result) => {
          setSelectedIds((prev) => {
            const updated = new Set(prev);
            for (const id of result.updated) updated.delete(id);
            return updated;
          });
        }}
      />
      <BulkRejectUserDialog
        ids={selectedArray}
        open={bulkRejectOpen}
        onOpenChange={setBulkRejectOpen}
        onCompleted={(result) => {
          setSelectedIds((prev) => {
            const updated = new Set(prev);
            for (const id of result.deleted) updated.delete(id);
            return updated;
          });
        }}
      />
      <BulkSuspendUserDialog
        ids={selectedArray}
        open={bulkSuspendOpen}
        onOpenChange={setBulkSuspendOpen}
        onCompleted={clearSelection}
      />
      <BulkReactivateUserDialog
        ids={selectedArray}
        open={bulkReactivateOpen}
        onOpenChange={setBulkReactivateOpen}
        onCompleted={clearSelection}
      />
      <BulkChangeUserRoleDialog
        ids={selectedArray}
        isCurrentUserSystemAdmin={isCurrentUserSystemAdmin}
        open={bulkRoleOpen}
        onOpenChange={setBulkRoleOpen}
        onCompleted={clearSelection}
      />
    </div>
  );
}
