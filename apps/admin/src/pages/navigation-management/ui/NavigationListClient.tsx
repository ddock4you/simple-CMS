'use client';

import { useQuery } from '@tanstack/react-query';

import { menuSetListOptions } from '@/features/navigation-management/api/navigationQueries';
import { MenuSetCard } from '@/features/navigation-management/ui/MenuSetCard';
import { MenuSetDialog } from '@/features/navigation-management/ui/MenuSetDialog';

interface NavigationListClientProps {
  canCreate: boolean;
}

export function NavigationListClient({ canCreate }: NavigationListClientProps) {
  const { data: menus } = useQuery(menuSetListOptions());

  return (
    <div className="space-y-4">
      {canCreate && (
        <div className="flex justify-end">
          <MenuSetDialog />
        </div>
      )}
      {!menus || menus.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
          메뉴가 없습니다.
        </div>
      ) : (
        <div className="grid gap-4">
          {menus.map((menu) => (
            <MenuSetCard key={menu.id} menu={menu} />
          ))}
        </div>
      )}
    </div>
  );
}
