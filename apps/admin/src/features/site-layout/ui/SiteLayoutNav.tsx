'use client';

import { AdminLink as Link } from '@/shared/ui/AdminLink';
import { usePathname } from 'next/navigation';

import type { Action, ResourceKey } from '@simple-cms/types';

import { usePermission } from '@/entities/auth/ui/PermissionProvider';
import { cn } from '@/shared/lib/utils';

interface TabConfig {
  label: string;
  href: string;
  anyOf: Array<{ resource: ResourceKey; action: Action }>;
}

const TABS: TabConfig[] = [
  {
    label: '헤더',
    href: '/site-layout/header',
    anyOf: [
      { resource: 'settings', action: 'read' },
      { resource: 'navigation', action: 'read' },
    ],
  },
  {
    label: '메뉴',
    href: '/site-layout/menus',
    anyOf: [{ resource: 'navigation', action: 'read' }],
  },
  {
    label: '푸터',
    href: '/site-layout/footer',
    anyOf: [
      { resource: 'settings', action: 'read' },
      { resource: 'navigation', action: 'read' },
    ],
  },
];

function GuardedNavLink({ tab }: { tab: TabConfig }) {
  const pathname = usePathname();
  const canReadSettings = usePermission('settings', 'read');
  const canReadNavigation = usePermission('navigation', 'read');
  const allowed = tab.anyOf.some((guard) => {
    if (guard.resource === 'settings' && guard.action === 'read') {
      return canReadSettings;
    }
    if (guard.resource === 'navigation' && guard.action === 'read') {
      return canReadNavigation;
    }
    return false;
  });

  if (!allowed) return null;

  const active = pathname === tab.href || pathname?.startsWith(`${tab.href}/`);

  return (
    <Link
      href={tab.href}
      className={cn(
        'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
        active
          ? 'border-primary text-primary'
          : 'border-transparent text-muted-foreground hover:text-foreground',
      )}
    >
      {tab.label}
    </Link>
  );
}

export function SiteLayoutNav() {
  return (
    <nav className="flex gap-1 border-b">
      {TABS.map((tab) => (
        <GuardedNavLink key={tab.href} tab={tab} />
      ))}
    </nav>
  );
}
