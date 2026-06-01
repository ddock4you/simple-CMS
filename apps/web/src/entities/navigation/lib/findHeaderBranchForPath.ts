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
  return findHeaderMatchForPath(headerItems, pathname)?.root ?? null;
}

export interface HeaderPathMatch {
  root: FilteredMenuItem;
  trail: FilteredMenuItem[];
}

export function findHeaderMatchForPath(
  headerItems: FilteredMenuItem[],
  pathname: string,
): HeaderPathMatch | null {
  for (const root of headerItems) {
    const trail = findPathTrail(root, pathname);
    if (trail) return { root, trail };
  }
  return null;
}

function findPathTrail(
  node: FilteredMenuItem,
  pathname: string,
): FilteredMenuItem[] | null {
  const href = getMenuItemHref(node);
  if (href !== '#' && isPathMatch(href, pathname)) return [node];

  for (const child of node.children) {
    const childTrail = findPathTrail(child, pathname);
    if (childTrail) return [node, ...childTrail];
  }

  return null;
}

function isPathMatch(href: string, pathname: string): boolean {
  if (href === pathname) return true;
  return href.startsWith('/board/') && pathname.startsWith(`${href}/`);
}
