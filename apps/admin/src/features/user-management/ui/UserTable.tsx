'use client';

import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/shadcn/table';
import { usePermission } from '@/entities/auth/ui/PermissionProvider';
import { ListSummary } from '@/shared/ui/ListSummary';
import { ListPagination } from '@/shared/ui/ListPagination';
import type { UserListFilters } from '@/features/user-management/model/userFilters';
import { userListOptions } from '@/features/user-management/api/userQueries';
import { UserStatusBadge } from '@/features/user-management/ui/UserStatusBadge';
import { UserRoleBadge } from '@/features/user-management/ui/UserRoleBadge';
import { UserActionButtons } from '@/features/user-management/ui/UserActionButtons';
import { UserRoleSelect } from '@/features/user-management/ui/UserRoleSelect';

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

  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
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
                <TableCell colSpan={6} className="h-24 text-center">
                  사용자가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((user) => (
                <TableRow key={user.id}>
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
    </div>
  );
}
