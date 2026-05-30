import { getMenuBySlot } from '../api/getNavigation';
import type { FilteredMenuItem } from './filterMenuItems';
import { findHeaderBranchForPath } from './findHeaderBranchForPath';

export interface ResolvedContentNavigation {
  rootLabel: string;
  items: FilteredMenuItem[];
}

export async function resolveContentNavigation(
  pathname: string,
  fallbackTitle: string,
): Promise<ResolvedContentNavigation> {
  const headerMenu = await getMenuBySlot('HEADER');
  const headerItems = headerMenu?.items ?? [];
  const branch = findHeaderBranchForPath(headerItems, pathname);

  if (branch) {
    return { rootLabel: branch.label, items: branch.children };
  }

  return { rootLabel: fallbackTitle, items: [] };
}
