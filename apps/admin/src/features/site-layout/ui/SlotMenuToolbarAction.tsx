'use client';

import { AdminLink as Link } from '@/shared/ui/AdminLink';
import type { NavigationMenuSlot } from '@simple-cms/db';
import { useQuery } from '@tanstack/react-query';
import { Edit, Loader2, Plus } from 'lucide-react';

import { usePermission } from '@/entities/auth/ui/PermissionProvider';
import { useCreateMenuSet } from '@/features/navigation-management/api/useNavigationMutations';
import { menuSetListOptions } from '@/features/navigation-management/api/navigationQueries';
import { SLOT_LABELS } from '@/features/navigation-management/ui/slotLabels';
import { Button } from '@/shared/ui/Button';

const SLOT_ACTION_CONFIG: Record<
  NavigationMenuSlot,
  { basePath: string; defaultName: string; defaultDescription: string }
> = {
  HEADER: {
    basePath: '/site-layout/header/menu',
    defaultName: 'Header Main',
    defaultDescription: '공개 웹 상단 GNB 메뉴',
  },
  FOOTER: {
    basePath: '/site-layout/footer/menu',
    defaultName: 'Footer',
    defaultDescription: '공개 웹 푸터 본문 링크 메뉴',
  },
  SIDEBAR: {
    basePath: '/site-layout/menus',
    defaultName: 'Sidebar',
    defaultDescription: '공개 웹 우측 사이드바 메뉴',
  },
};

interface SlotMenuToolbarActionProps {
  slot: NavigationMenuSlot;
}

export function SlotMenuToolbarAction({ slot }: SlotMenuToolbarActionProps) {
  const canCreate = usePermission('navigation', 'create');
  const canUpdate = usePermission('navigation', 'update');
  const canRead = usePermission('navigation', 'read');
  const { data: menus, isPending } = useQuery({
    ...menuSetListOptions(),
    enabled: canRead,
  });
  const config = SLOT_ACTION_CONFIG[slot];
  const createMutation = useCreateMenuSet(config.basePath);

  if (!canRead) return null;

  const menu = menus?.find((item) => item.slots.includes(slot));

  if (menu && canUpdate) {
    return (
      <Button
        variant="outline"
        nativeButton={false}
        render={<Link href={`${config.basePath}/${menu.id}`} />}
      >
        <Edit className="size-4" />
        메뉴 편집
      </Button>
    );
  }

  if (!menu && canCreate) {
    return (
      <Button
        type="button"
        variant="outline"
        disabled={isPending || createMutation.isPending}
        onClick={() => {
          createMutation.mutate({
            name: config.defaultName,
            description: config.defaultDescription,
            slots: [slot],
          });
        }}
      >
        {createMutation.isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Plus className="size-4" />
        )}
        메뉴 생성
      </Button>
    );
  }

  if (menu && !canUpdate) {
    return (
      <Button type="button" variant="outline" disabled>
        메뉴 편집 권한 없음
      </Button>
    );
  }

  if (isPending) return null;

  return (
    <Button type="button" variant="outline" disabled>
      {canCreate ? `${SLOT_LABELS[slot]} 메뉴 없음` : '메뉴 생성 권한 없음'}
    </Button>
  );
}
