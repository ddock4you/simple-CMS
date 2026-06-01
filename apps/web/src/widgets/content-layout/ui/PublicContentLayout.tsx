import type { ReactNode } from 'react';

import type { FilteredMenuItem } from '@/entities/navigation/lib/filterMenuItems';
import { Breadcrumb } from '@/shared/ui/KrdsBreadcrumb';

import { ContentSideNavigation } from './ContentSideNavigation';

export interface ContentNavigationBranch {
  rootLabel: string;
  items: FilteredMenuItem[];
  breadcrumbItems: BreadcrumbItem[];
}

interface BreadcrumbItem {
  text: string;
  href: string;
}

interface PublicContentLayoutProps {
  breadcrumbItems: BreadcrumbItem[];
  navigationBranch: ContentNavigationBranch;
  children: ReactNode;
}

export function PublicContentLayout({
  breadcrumbItems,
  navigationBranch,
  children,
}: PublicContentLayoutProps) {
  return (
    <div className="page-container">
      <div className="subpage-layout">
        <ContentSideNavigation
          rootLabel={navigationBranch.rootLabel}
          items={navigationBranch.items}
        />
        <div className="subpage-content">
          <Breadcrumb items={breadcrumbItems} ariaLabel="현재 위치" />
          {children}
        </div>
      </div>
    </div>
  );
}

export function buildContentBreadcrumbItems(
  navigationBranch: ContentNavigationBranch,
  currentItem: BreadcrumbItem,
): BreadcrumbItem[] {
  const trail = navigationBranch.breadcrumbItems;
  const hasCurrentInTrail = trail.some(
    (item) =>
      (currentItem.href !== '#' && item.href === currentItem.href) ||
      item.text === currentItem.text,
  );
  const contentTrail = hasCurrentInTrail
    ? trail.map((item, index) =>
        index === trail.length - 1 ? { ...item, href: '#' } : item,
      )
    : [...trail, { ...currentItem, href: '#' }];

  return [{ text: '홈', href: '/' }, ...contentTrail];
}
