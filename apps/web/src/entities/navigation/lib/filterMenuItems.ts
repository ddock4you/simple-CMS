interface RawMenuItem {
  id: string;
  label: string;
  itemType: string;
  url: string | null;
  isVisible: boolean;
  openInNewTab: boolean;
  displayOrder: number;
  startDate: Date | null;
  endDate: Date | null;
  subpage: { slug: string; status: string } | null;
  board: { slug: string; isPublic: boolean } | null;
  children?: RawMenuItem[];
}

export interface FilteredMenuItem {
  id: string;
  label: string;
  itemType: string;
  url: string | null;
  openInNewTab: boolean;
  subpage: { slug: string } | null;
  board: { slug: string } | null;
  children: FilteredMenuItem[];
}

function isWithinDateRange(startDate: Date | null, endDate: Date | null): boolean {
  const now = new Date();
  if (startDate && now < startDate) return false;
  if (endDate && now > endDate) return false;
  return true;
}

function isItemVisible(item: RawMenuItem): boolean {
  if (!item.isVisible) return false;
  if (!isWithinDateRange(item.startDate, item.endDate)) return false;

  if (item.itemType === 'SUBPAGE') {
    if (!item.subpage || item.subpage.status !== 'PUBLISHED') return false;
  }

  if (item.itemType === 'BOARD') {
    if (!item.board || !item.board.isPublic) return false;
  }

  return true;
}

export function filterMenuItems(items: RawMenuItem[]): FilteredMenuItem[] {
  return items
    .filter(isItemVisible)
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((item) => ({
      id: item.id,
      label: item.label,
      itemType: item.itemType,
      url: item.url,
      openInNewTab: item.openInNewTab,
      subpage: item.subpage ? { slug: item.subpage.slug } : null,
      board: item.board ? { slug: item.board.slug } : null,
      children: filterMenuItems(item.children ?? []),
    }));
}
