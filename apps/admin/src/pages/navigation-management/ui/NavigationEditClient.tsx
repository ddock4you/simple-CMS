'use client';

import { AdminLink as Link } from '@/shared/ui/AdminLink';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';

import { Badge } from '@/shared/ui/shadcn/badge';
import { Button } from '@/shared/ui/Button';
import {
  getQueryErrorMessage,
  QueryStateMessage,
} from '@/shared/ui/QueryStateMessage';
import { usePermission } from '@/entities/auth/ui/PermissionProvider';
import { PageHeader } from '@/shared/ui/PageHeader';

import { menuSetDetailOptions } from '@/features/navigation-management/api/navigationQueries';
import { MenuItemTree } from '@/features/navigation-management/ui/MenuItemTree';
import { MenuSetEditDialog } from '@/features/navigation-management/ui/MenuSetEditDialog';
import { SLOT_LABELS } from '@/features/navigation-management/ui/slotLabels';

interface NavigationEditClientProps {
  menuId: string;
  backHref?: string;
  backLabel?: string;
}

export function NavigationEditClient({
  menuId,
  backHref = '/navigation',
  backLabel = '목록으로',
}: NavigationEditClientProps) {
  const { data, isPending, isError, error } = useQuery(
    menuSetDetailOptions(menuId),
  );
  const canUpdate = usePermission('navigation', 'update');

  if (isPending) {
    return <QueryStateMessage title="메뉴 정보를 불러오는 중..." />;
  }

  if (isError || !data) {
    return (
      <QueryStateMessage
        title="메뉴 정보를 불러오지 못했습니다."
        details={isError ? getQueryErrorMessage(error) : undefined}
        tone="destructive"
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        back={
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link href={backHref} />}
          >
            <ArrowLeft className="size-4" />
            {backLabel}
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
