import type { FilteredMenuItem } from './filterMenuItems';

export function isExternalMenuItem(item: FilteredMenuItem, href: string): boolean {
  return item.itemType === 'EXTERNAL' || /^https?:\/\//i.test(href);
}
