'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';

import { Badge } from '@/shared/ui/shadcn/badge';
import { Button } from '@/shared/ui/shadcn/button';
import { usePermission } from '@/entities/auth/ui/PermissionProvider';

import { menuSetDetailOptions } from '@/features/navigation-management/api/navigationQueries';
import { MenuItemTree } from '@/features/navigation-management/ui/MenuItemTree';
import { MenuSetEditDialog } from '@/features/navigation-management/ui/MenuSetEditDialog';
import { SLOT_LABELS } from '@/features/navigation-management/ui/slotLabels';

interface NavigationEditClientProps {
  menuId: string;
}

export function NavigationEditClient({ menuId }: NavigationEditClientProps) {
  const { data } = useQuery(menuSetDetailOptions(menuId));
  const canUpdate = usePermission('navigation', 'update');

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href="/navigation" />}
        >
          <ArrowLeft className="size-4" />
          목록으로
        </Button>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">{data.name}</h1>
          {data.slots.map((s) => (
            <Badge key={s} variant={s === 'HEADER' ? 'default' : 'secondary'}>
              {SLOT_LABELS[s]}
            </Badge>
          ))}
        </div>
        <div className="ml-auto">
          {canUpdate && (
            <MenuSetEditDialog
              menuId={menuId}
              name={data.name}
              description={data.description}
              slots={data.slots}
            />
          )}
        </div>
      </div>
      {data.description && (
        <p className="text-muted-foreground -mt-4">{data.description}</p>
      )}

      <MenuItemTree menuId={menuId} items={data.items} />
    </div>
  );
}
