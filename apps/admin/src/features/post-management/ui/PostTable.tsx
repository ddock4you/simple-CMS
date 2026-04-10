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
import { usePermission } from '@/entities/auth/ui/PermissionProvider';

import type { PostListFilters } from '../model/postFilters';
import { postListOptions } from '../api/postQueries';
import { PostStatusBadge } from './PostStatusBadge';
import { PostPagination } from './PostPagination';

interface PostTableProps {
  filters: PostListFilters;
}

export function PostTable({ filters }: PostTableProps) {
  const { data } = useQuery(postListOptions(filters));
  const canUpdate = usePermission('posts', 'update');

  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
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
                <TableCell colSpan={6} className="h-24 text-center">
                  게시글이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((post) => (
                <TableRow key={post.id}>
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
                    <PostStatusBadge status={post.status} />
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
    </div>
  );
}
