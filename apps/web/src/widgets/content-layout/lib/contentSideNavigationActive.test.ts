import { describe, expect, it } from 'vitest';

import type { FilteredMenuItem } from '@/entities/navigation/lib/filterMenuItems';

import {
  findDeepestActiveMenuItemId,
  hasActiveMenuItem,
  isPathActive,
} from './contentSideNavigationActive';

function menuItem(
  id: string,
  href: string,
  children: FilteredMenuItem[] = [],
): FilteredMenuItem {
  const isBoard = href.startsWith('/board/');

  return {
    id,
    label: id,
    itemType: isBoard ? 'BOARD' : 'CUSTOM',
    url: isBoard ? null : href,
    openInNewTab: false,
    subpage: null,
    board: isBoard ? { slug: href.replace('/board/', '') } : null,
    children,
  };
}

describe('contentSideNavigationActive', () => {
  it('selects only the deepest item when parent and child share a URL', () => {
    const items = [
      menuItem('depth-2', '/p/park-guide', [
        menuItem('depth-3', '/p/park-guide'),
      ]),
    ];

    expect(findDeepestActiveMenuItemId(items, '/p/park-guide')).toBe('depth-3');
  });

  it('keeps the parent branch expanded when a descendant is active', () => {
    const item = menuItem('depth-2', '/p/park-guide', [
      menuItem('depth-3', '/p/park-guide'),
    ]);

    expect(hasActiveMenuItem(item, '/p/park-guide')).toBe(true);
  });

  it('treats board detail pages as active for the board menu path', () => {
    expect(isPathActive('/board/notices', '/board/notices/important-post')).toBe(
      true,
    );
  });
});
