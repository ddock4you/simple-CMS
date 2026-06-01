import { getMenuBySlot } from '../api/getNavigation';
import type { FilteredMenuItem } from './filterMenuItems';
import { findHeaderMatchForPath } from './findHeaderBranchForPath';
import { getMenuItemHref } from './getMenuItemHref';

export interface ContentBreadcrumbItem {
  text: string;
  href: string;
}

export interface ResolvedContentNavigation {
  rootLabel: string;
  items: FilteredMenuItem[];
  breadcrumbItems: ContentBreadcrumbItem[];
}

export async function resolveContentNavigation(
  pathname: string,
  fallbackTitle: string,
): Promise<ResolvedContentNavigation> {
  const headerMenu = await getMenuBySlot('HEADER');
  const headerItems = headerMenu?.items ?? [];
  const match = findHeaderMatchForPath(headerItems, pathname);

  if (match) {
    return {
      rootLabel: match.root.label,
      items: match.root.children,
      breadcrumbItems: match.trail.map((item) => ({
        text: item.label,
        href: getMenuItemHref(item),
      })),
    };
  }

  return { rootLabel: fallbackTitle, items: [], breadcrumbItems: [] };
}
