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

import type { SubpageListFilters } from '../model/subpageFilters';
import { subpageListOptions } from '../api/subpageQueries';
import { SubpageStatusBadge } from './SubpageStatusBadge';
import { SubpagePagination } from './SubpagePagination';

interface SubpageTableProps {
  filters: SubpageListFilters;
}

export function SubpageTable({ filters }: SubpageTableProps) {
  const { data } = useQuery(subpageListOptions(filters));
  const canUpdate = usePermission('subpages', 'update');

  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>제목</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>수정일</TableHead>
              <TableHead className="text-right">액션</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  서브 페이지가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((subpage) => (
                <TableRow key={subpage.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/subpages/${subpage.id}`}
                      className="hover:underline"
                    >
                      {subpage.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    /{subpage.slug}
                  </TableCell>
                  <TableCell>
                    <SubpageStatusBadge status={subpage.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(subpage.updatedAt), 'yyyy-MM-dd HH:mm')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        nativeButton={false}
                        render={<Link href={`/subpages/${subpage.id}`} />}
                        title="보기"
                      >
                        <Eye className="size-4" />
                      </Button>
                      {canUpdate && (
                        <Button
                          variant="ghost"
                          size="sm"
                          nativeButton={false}
                          render={<Link href={`/subpages/${subpage.id}/edit`} />}
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
      <SubpagePagination
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
      />
    </div>
  );
}
