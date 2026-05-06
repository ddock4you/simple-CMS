'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Eye, Pencil, Trash2, ListChecks } from 'lucide-react';

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
import { InlineStatusSwitchToggle } from '@/shared/ui/InlineStatusSwitchToggle';
import { BulkActionBar } from '@/shared/ui/BulkActionBar';
import { ListSummary } from '@/shared/ui/ListSummary';
import { ListPagination } from '@/shared/ui/ListPagination';
import { usePermission } from '@/entities/auth/ui/PermissionProvider';

import type { SubpageListFilters } from '../model/subpageFilters';
import { subpageListOptions } from '../api/subpageQueries';
import { useToggleSubpageStatus } from '../api/useSubpageMutations';
import { SubpageStatusBadge } from './SubpageStatusBadge';
import { BulkDeleteSubpageDialog } from './BulkDeleteSubpageDialog';
import { BulkStatusSubpageDialog } from './BulkStatusSubpageDialog';

interface SubpageTableProps {
  filters: SubpageListFilters;
}

export function SubpageTable({ filters }: SubpageTableProps) {
  const { data } = useQuery(subpageListOptions(filters));
  const canUpdate = usePermission('subpages', 'update');
  const canDelete = usePermission('subpages', 'delete');
  const toggleStatus = useToggleSubpageStatus();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false);

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
      <ListSummary total={data.total} page={data.page} pageSize={data.pageSize} />
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {showBulk && <TableHead className="w-12" />}
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
                <TableCell
                  colSpan={showBulk ? 6 : 5}
                  className="h-24 text-center"
                >
                  서브 페이지가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((subpage) => (
                <TableRow key={subpage.id}>
                  {showBulk && (
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(subpage.id)}
                        onCheckedChange={(c) =>
                          toggleOne(subpage.id, c === true)
                        }
                        aria-label={`${subpage.title} 선택`}
                      />
                    </TableCell>
                  )}
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
                    {canUpdate ? (
                      <InlineStatusSwitchToggle
                        value={subpage.status}
                        onState="PUBLISHED"
                        offState="DRAFT"
                        onChange={(status) =>
                          toggleStatus.mutate({ id: subpage.id, status })
                        }
                        isPending={
                          toggleStatus.isPending &&
                          toggleStatus.variables?.id === subpage.id
                        }
                      />
                    ) : (
                      <SubpageStatusBadge status={subpage.status} />
                    )}
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
      <ListPagination page={data.page} pageSize={data.pageSize} total={data.total} />
      <BulkDeleteSubpageDialog
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
      <BulkStatusSubpageDialog
        ids={selectedArray}
        open={bulkStatusOpen}
        onOpenChange={setBulkStatusOpen}
        onCompleted={clearSelection}
      />
    </div>
  );
}
