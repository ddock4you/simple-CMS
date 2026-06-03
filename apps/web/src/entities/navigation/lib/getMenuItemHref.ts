import type { FilteredMenuItem } from './filterMenuItems';

export function getMenuItemHref(item: FilteredMenuItem): string {
  switch (item.itemType) {
    case 'GROUP':
      return '#';
    case 'SUBPAGE':
      return item.subpage ? `/p/${item.subpage.slug}` : '#';
    case 'BOARD':
      return item.board ? `/board/${item.board.slug}` : '#';
    case 'EXTERNAL':
    case 'CUSTOM':
      return item.url ?? '#';
    default:
      return '#';
  }
}
