'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/shared/ui/shadcn/button';

import { menuSetDetailOptions } from '@/features/navigation-management/api/navigationQueries';
import { MenuItemTree } from '@/features/navigation-management/ui/MenuItemTree';

interface NavigationEditClientProps {
  menuId: string;
}

export function NavigationEditClient({ menuId }: NavigationEditClientProps) {
  const { data } = useQuery(menuSetDetailOptions(menuId));

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
        <div>
          <h1 className="text-2xl font-bold">{data.name}</h1>
          {data.description && (
            <p className="text-muted-foreground">{data.description}</p>
          )}
        </div>
      </div>

      <MenuItemTree menuId={menuId} items={data.items} />
    </div>
  );
}
