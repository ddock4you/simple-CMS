'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { ChevronRight, Trash2 } from 'lucide-react';

import { Button } from '@/shared/ui/shadcn/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import { usePermission } from '@/entities/auth/ui/PermissionProvider';

import type { MenuSetListItem } from '../model/navigationFilters';
import { DeleteMenuSetDialog } from './DeleteMenuSetDialog';
import { useDeleteMenuSet } from '../api/useNavigationMutations';

interface MenuSetCardProps {
  menu: MenuSetListItem;
}

export function MenuSetCard({ menu }: MenuSetCardProps) {
  const canUpdate = usePermission('navigation', 'update');
  const canDelete = usePermission('navigation', 'delete');
  const deleteMutation = useDeleteMenuSet();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg">{menu.name}</CardTitle>
        <div className="flex items-center gap-1">
          {canDelete && (
            <DeleteMenuSetDialog
              name={menu.name}
              isPending={deleteMutation.isPending}
              onConfirm={() => deleteMutation.mutate(menu.id)}
            />
          )}
          {canUpdate && (
            <Button
              variant="ghost"
              size="sm"
              nativeButton={false}
              render={<Link href={`/navigation/${menu.id}`} />}
            >
              편집
              <ChevronRight className="size-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {menu.description ?? '설명 없음'}
          </span>
          <span>
            {menu.itemCount}개 항목 · {format(new Date(menu.updatedAt), 'yyyy-MM-dd')}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
