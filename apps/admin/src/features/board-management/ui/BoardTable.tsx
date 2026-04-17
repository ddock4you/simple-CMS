'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Eye, Pencil } from 'lucide-react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/shadcn/table';
import { Button } from '@/shared/ui/shadcn/button';
import { InlineBooleanToggle } from '@/shared/ui/InlineBooleanToggle';
import { usePermission } from '@/entities/auth/ui/PermissionProvider';

import type { BoardListFilters } from '../model/boardFilters';
import { boardListOptions } from '../api/boardQueries';
import { useToggleBoardVisibility } from '../api/useBoardMutations';
import { BoardSkinTypeBadge } from './BoardSkinTypeBadge';
import { BoardVisibilityBadge } from './BoardVisibilityBadge';
import { BoardPagination } from './BoardPagination';

interface BoardTableProps {
  filters: BoardListFilters;
}

export function BoardTable({ filters }: BoardTableProps) {
  const { data } = useQuery(boardListOptions(filters));
  const canUpdate = usePermission('boards', 'update');
  const toggleVisibility = useToggleBoardVisibility();

  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>이름</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>스킨</TableHead>
              <TableHead>공개</TableHead>
              <TableHead>게시글</TableHead>
              <TableHead>수정일</TableHead>
              <TableHead className="text-right">액션</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  게시판이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((board) => (
                <TableRow key={board.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/boards/${board.id}`}
                      className="hover:underline"
                    >
                      {board.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    /{board.slug}
                  </TableCell>
                  <TableCell>
                    <BoardSkinTypeBadge skinType={board.skinType} />
                  </TableCell>
                  <TableCell>
                    {canUpdate ? (
                      <InlineBooleanToggle
                        value={board.isPublic}
                        onChange={(isPublic) =>
                          toggleVisibility.mutate({ id: board.id, isPublic })
                        }
                        isPending={
                          toggleVisibility.isPending &&
                          toggleVisibility.variables?.id === board.id
                        }
                      />
                    ) : (
                      <BoardVisibilityBadge isPublic={board.isPublic} />
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {board.postCount}건
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(board.updatedAt), 'yyyy-MM-dd HH:mm')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        nativeButton={false}
                        render={<Link href={`/boards/${board.id}`} />}
                        title="보기"
                      >
                        <Eye className="size-4" />
                      </Button>
                      {canUpdate && (
                        <Button
                          variant="ghost"
                          size="sm"
                          nativeButton={false}
                          render={<Link href={`/boards/${board.id}/edit`} />}
                          title="편집"
                        >
                          <Pencil className="size-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <BoardPagination
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
      />
    </div>
  );
}
