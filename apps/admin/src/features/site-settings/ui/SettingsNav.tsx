'use client';

import { AdminLink as Link } from '@/shared/ui/AdminLink';
import { usePathname } from 'next/navigation';

import type { ResourceKey, Action } from '@simple-cms/types';

import { usePermission } from '@/entities/auth/ui/PermissionProvider';
import { cn } from '@/shared/lib/utils';

interface TabConfig {
  label: string;
  href: string;
  /** 이 권한이 없으면 탭 자체를 숨김. 미설정 시 항상 표시 */
  guard?: { resource: ResourceKey; action: Action };
}

const TABS: TabConfig[] = [
  { label: '도메인', href: '/settings/domain' },
  { label: '보안', href: '/settings/security' },
  { label: '업로드', href: '/settings/upload' },
  { label: '권한', href: '/settings/roles' },
  { label: '브랜딩', href: '/settings/branding' },
  { label: '푸터', href: '/settings/footer' },
  { label: 'SEO', href: '/settings/seo' },
  {
    label: '시연 스냅샷',
    href: '/settings/demo-snapshot',
    guard: { resource: 'demo-snapshot', action: 'read' },
  },
];

function NavLink({ tab, active }: { tab: TabConfig; active: boolean }) {
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

function GuardedNavLink({ tab, active }: { tab: TabConfig; active: boolean }) {
  const allowed = usePermission(tab.guard!.resource, tab.guard!.action);
  if (!allowed) return null;
  return <NavLink tab={tab} active={active} />;
}

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 border-b">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        if (tab.guard) {
          return <GuardedNavLink key={tab.href} tab={tab} active={active} />;
        }
        return <NavLink key={tab.href} tab={tab} active={active} />;
      })}
    </nav>
  );
}
