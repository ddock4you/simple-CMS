'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Eye, Pencil, Trash2, ListChecks, FolderInput } from 'lucide-react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/shadcn/table';
import { Button } from '@/shared/ui/shadcn/button';
import { Checkbox } from '@/shared/ui/shadcn/checkbox';
import { InlineStatusToggle } from '@/shared/ui/InlineStatusToggle';
import { BulkActionBar } from '@/shared/ui/BulkActionBar';
import { usePermission } from '@/entities/auth/ui/PermissionProvider';

import type { PostListFilters } from '../model/postFilters';
import { postListOptions } from '../api/postQueries';
import { useTogglePostStatus } from '../api/usePostMutations';
import { PostStatusBadge } from './PostStatusBadge';
import { PostPagination } from './PostPagination';
import { BulkDeletePostDialog } from './BulkDeletePostDialog';
import { BulkStatusPostDialog } from './BulkStatusPostDialog';
import { BulkMovePostDialog } from './BulkMovePostDialog';

const STATUS_OPTIONS = [
  { value: 'DRAFT' as const, label: '초안' },
  { value: 'PUBLISHED' as const, label: '발행' },
];

interface PostTableProps {
  filters: PostListFilters;
}

export function PostTable({ filters }: PostTableProps) {
  const { data } = useQuery(postListOptions(filters));
  const canUpdate = usePermission('posts', 'update');
  const canDelete = usePermission('posts', 'delete');
  const toggleStatus = useTogglePostStatus();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false);
  const [bulkMoveOpen, setBulkMoveOpen] = useState(false);

  const pageIds = useMemo(
    () => data?.items.map((item) => item.id) ?? [],
    [data],
  );

  const selectedOnPage = useMemo(
    () => pageIds.filter((id) => selectedIds.has(id)),
    [pageIds, selectedIds],
  );

  const isAllOnPageSelected =
    pageIds.length > 0 && selectedOnPage.length === pageIds.length;
  const isIndeterminate =
    selectedOnPage.length > 0 && selectedOnPage.length < pageIds.length;

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

  const showBulk = canUpdate || canDelete;

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
          actions={[
            ...(canUpdate
              ? [
                  {
                    key: 'status',
                    label: '상태 변경',
                    icon: <ListChecks className="size-4" />,
                    onClick: () => setBulkStatusOpen(true),
                  },
                  {
                    key: 'move',
                    label: '게시판 이동',
                    icon: <FolderInput className="size-4" />,
                    onClick: () => setBulkMoveOpen(true),
                  },
                ]
              : []),
            ...(canDelete
              ? [
                  {
                    key: 'delete',
                    label: '삭제',
                    icon: <Trash2 className="size-4" />,
                    variant: 'destructive' as const,
                    onClick: () => setBulkDeleteOpen(true),
                  },
                ]
              : []),
          ]}
        />
      )}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {showBulk && <TableHead className="w-12" />}
              <TableHead>제목</TableHead>
              <TableHead>게시판</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>작성자</TableHead>
              <TableHead>수정일</TableHead>
              <TableHead className="text-right">액션</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={showBulk ? 7 : 6}
                  className="h-24 text-center"
                >
                  게시글이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((post) => (
                <TableRow key={post.id}>
                  {showBulk && (
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(post.id)}
                        onCheckedChange={(c) => toggleOne(post.id, c === true)}
                        aria-label={`${post.title} 선택`}
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-medium">
                    <Link
                      href={`/posts/${post.id}`}
                      className="hover:underline"
                    >
                      {post.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {post.boardName}
                  </TableCell>
                  <TableCell>
                    {canUpdate ? (
                      <InlineStatusToggle
                        value={post.status}
                        options={STATUS_OPTIONS}
                        onChange={(status) =>
                          toggleStatus.mutate({ id: post.id, status })
                        }
                        isPending={
                          toggleStatus.isPending &&
                          toggleStatus.variables?.id === post.id
                        }
                      />
                    ) : (
                      <PostStatusBadge status={post.status} />
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {post.authorName ?? '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(post.updatedAt), 'yyyy-MM-dd HH:mm')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        nativeButton={false}
                        render={<Link href={`/posts/${post.id}`} />}
                        title="보기"
                      >
                        <Eye className="size-4" />
                      </Button>
                      {canUpdate && (
                        <Button
                          variant="ghost"
                          size="sm"
                          nativeButton={false}
                          render={<Link href={`/posts/${post.id}/edit`} />}
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
      <PostPagination
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
      />
      <BulkDeletePostDialog
        ids={selectedArray}
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        onCompleted={(result) => {
          setSelectedIds((prev) => {
            const updated = new Set(prev);
            for (const id of result.deleted) updated.delete(id);
            return updated;
          });
        }}
      />
      <BulkStatusPostDialog
        ids={selectedArray}
        open={bulkStatusOpen}
        onOpenChange={setBulkStatusOpen}
        onCompleted={clearSelection}
      />
      <BulkMovePostDialog
        ids={selectedArray}
        open={bulkMoveOpen}
        onOpenChange={setBulkMoveOpen}
        onCompleted={(result) => {
          setSelectedIds((prev) => {
            const updated = new Set(prev);
            for (const id of result.updated) updated.delete(id);
            return updated;
          });
        }}
      />
    </div>
  );
}
