'use client';

import { useQuery } from '@tanstack/react-query';

import { menuSetListOptions } from '@/features/navigation-management/api/navigationQueries';
import { MenuSetCard } from '@/features/navigation-management/ui/MenuSetCard';
import { MenuSetDialog } from '@/features/navigation-management/ui/MenuSetDialog';
import {
  getQueryErrorMessage,
  QueryStateMessage,
} from '@/shared/ui/QueryStateMessage';

interface NavigationListClientProps {
  canCreate: boolean;
}

export function NavigationListClient({ canCreate }: NavigationListClientProps) {
  const {
    data: menus,
    isPending,
    isError,
    error,
  } = useQuery(menuSetListOptions());

  return (
    <div className="space-y-4">
      {canCreate && (
        <div className="flex justify-end">
          <MenuSetDialog />
        </div>
      )}
      {isPending ? (
        <QueryStateMessage title="메뉴를 불러오는 중..." />
      ) : isError ? (
        <QueryStateMessage
          title="메뉴 목록을 불러오지 못했습니다."
          details={getQueryErrorMessage(error)}
          tone="destructive"
        />
      ) : menus.length === 0 ? (
        <QueryStateMessage title="메뉴가 없습니다." />
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
