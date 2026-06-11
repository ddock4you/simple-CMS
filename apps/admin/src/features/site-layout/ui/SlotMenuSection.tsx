'use client';

import type { NavigationMenuSlot } from '@simple-cms/db';
import { useQuery } from '@tanstack/react-query';

import { usePermission } from '@/entities/auth/ui/PermissionProvider';
import { menuSetListOptions } from '@/features/navigation-management/api/navigationQueries';
import { MenuSetCard } from '@/features/navigation-management/ui/MenuSetCard';
import { MenuSetDialog } from '@/features/navigation-management/ui/MenuSetDialog';
import { SLOT_LABELS } from '@/features/navigation-management/ui/slotLabels';
import {
  getQueryErrorMessage,
  QueryStateMessage,
} from '@/shared/ui/QueryStateMessage';
import { Button } from '@/shared/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/shadcn/card';

interface SlotMenuSectionProps {
  slot: NavigationMenuSlot;
  title: string;
  description: string;
}

const SITE_LAYOUT_MENU_PATH = '/site-layout/menus';

export function SlotMenuSection({
  slot,
  title,
  description,
}: SlotMenuSectionProps) {
  const canCreate = usePermission('navigation', 'create');
  const { data, isPending, isError, error } = useQuery(menuSetListOptions());

  if (isPending) {
    return <QueryStateMessage title={`${SLOT_LABELS[slot]} 메뉴를 불러오는 중...`} />;
  }

  if (isError || !data) {
    return (
      <QueryStateMessage
        title={`${SLOT_LABELS[slot]} 메뉴를 불러오지 못했습니다.`}
        details={isError ? getQueryErrorMessage(error) : undefined}
        tone="destructive"
      />
    );
  }

  const menu = data.find((item) => item.slots.includes(slot));

  if (menu) {
    return (
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <MenuSetCard
          menu={menu}
          editBasePath={SITE_LAYOUT_MENU_PATH}
          deleteRedirectPath={SITE_LAYOUT_MENU_PATH}
        />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">{description}</p>
        {canCreate ? (
          <MenuSetDialog
            defaultSlots={[slot]}
            redirectBasePath={SITE_LAYOUT_MENU_PATH}
            triggerLabel={`${SLOT_LABELS[slot]} 메뉴 생성`}
          />
        ) : (
          <Button type="button" variant="outline" disabled>
            메뉴 생성 권한 없음
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
