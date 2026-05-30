import type { FilteredMenuItem } from './filterMenuItems';
import { getMenuItemHref } from './getMenuItemHref';

/**
 * HEADER 메뉴에서 현재 경로가 속한 1뎁스 루트 항목을 찾는다.
 * - 루트의 자식 트리(또는 루트 자신)가 pathname과 매칭되면 해당 **루트** 반환.
 * - 어떤 루트도 매칭되지 않으면 null.
 * - 이 결과의 children을 좌측 사이드바의 2/3뎁스 트리로 그대로 렌더한다.
 */
export function findHeaderBranchForPath(
  headerItems: FilteredMenuItem[],
  pathname: string,
): FilteredMenuItem | null {
  for (const root of headerItems) {
    if (subtreeContainsPath(root, pathname)) {
      return root;
    }
  }
  return null;
}

function subtreeContainsPath(
  node: FilteredMenuItem,
  pathname: string,
): boolean {
  const href = getMenuItemHref(node);
  if (href !== '#' && isPathMatch(href, pathname)) return true;
  for (const child of node.children) {
    if (subtreeContainsPath(child, pathname)) return true;
  }
  return false;
}

function isPathMatch(href: string, pathname: string): boolean {
  if (href === pathname) return true;
  return href.startsWith('/board/') && pathname.startsWith(`${href}/`);
}
