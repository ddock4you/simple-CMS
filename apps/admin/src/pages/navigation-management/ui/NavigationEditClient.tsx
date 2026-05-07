'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';

import { Badge } from '@/shared/ui/shadcn/badge';
import { Button } from '@/shared/ui/shadcn/button';
import { usePermission } from '@/entities/auth/ui/PermissionProvider';
import { PageHeader } from '@/shared/ui/PageHeader';

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
      <PageHeader
        back={
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link href="/navigation" />}
          >
            <ArrowLeft className="size-4" />
            목록으로
          </Button>
        }
        title={
          <span className="flex items-center gap-2">
            {data.name}
            {data.slots.map((s) => (
              <Badge key={s} variant={s === 'HEADER' ? 'default' : 'secondary'}>
                {SLOT_LABELS[s]}
              </Badge>
            ))}
          </span>
        }
        description={data.description ?? undefined}
        actions={
          canUpdate ? (
            <MenuSetEditDialog
              menuId={menuId}
              name={data.name}
              description={data.description}
              slots={data.slots}
            />
          ) : undefined
        }
      />

      <MenuItemTree menuId={menuId} items={data.items} />
    </div>
  );
}
