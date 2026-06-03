import type { FilteredMenuItem } from '@/entities/navigation/lib/filterMenuItems';
import { getMenuItemHref } from '@/entities/navigation/lib/getMenuItemHref';

export function findDeepestActiveMenuItemId(
  items: FilteredMenuItem[],
  pathname: string,
): string | null {
  let activeItemId: string | null = null;
  let activeDepth = -1;

  const visit = (item: FilteredMenuItem, depth: number) => {
    const href = getMenuItemHref(item);
    if (
      href !== '#' &&
      isPathActive(href, pathname) &&
      depth > activeDepth
    ) {
      activeItemId = item.id;
      activeDepth = depth;
    }

    for (const child of item.children) {
      visit(child, depth + 1);
    }
  };

  for (const item of items) {
    visit(item, 0);
  }

  return activeItemId;
}

export function hasActiveMenuItem(
  item: FilteredMenuItem,
  pathname: string,
): boolean {
  const href = getMenuItemHref(item);
  if (href !== '#' && isPathActive(href, pathname)) return true;
  return item.children.some((child) => hasActiveMenuItem(child, pathname));
}

export function isPathActive(href: string, pathname: string): boolean {
  if (pathname === href) return true;
  return href.startsWith('/board/') && pathname.startsWith(`${href}/`);
}
