'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/shared/lib/utils';

const TABS = [
  { label: '도메인', href: '/settings/domain' },
  { label: '보안', href: '/settings/security' },
  { label: '업로드', href: '/settings/upload' },
  { label: '권한', href: '/settings/roles' },
  { label: '브랜딩', href: '/settings/branding' },
  { label: 'SEO', href: '/settings/seo' },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 border-b">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
            pathname === tab.href
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
