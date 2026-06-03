'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { SideNavigation } from 'krds-react';

import type { FilteredMenuItem } from '@/entities/navigation/lib/filterMenuItems';
import { getMenuItemHref } from '@/entities/navigation/lib/getMenuItemHref';
import { isExternalMenuItem } from '@/entities/navigation/lib/isExternalMenuItem';
import { ExternalMenuIcon } from '@/entities/navigation/ui/ExternalMenuIcon';

import {
  findDeepestActiveMenuItemId,
  hasActiveMenuItem,
} from '../lib/contentSideNavigationActive';

interface ContentSideNavigationProps {
  rootLabel: string;
  items: FilteredMenuItem[];
}

export function ContentSideNavigation({
  rootLabel,
  items,
}: ContentSideNavigationProps) {
  const pathname = usePathname() ?? '';
  const activeItemId = findDeepestActiveMenuItemId(items, pathname);

  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const item of items) {
      if (hasActiveMenuItem(item, pathname)) {
        initial[item.id] = true;
        for (const child of item.children) {
          if (hasActiveMenuItem(child, pathname)) initial[child.id] = true;
        }
      }
    }
    return initial;
  });

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const isActive = (item: FilteredMenuItem) => {
    return item.id === activeItemId;
  };

  return (
    <aside className="subpage-side-nav" aria-label={`${rootLabel} 하위 메뉴`}>
      <SideNavigation aria-label={`${rootLabel} 하위 메뉴`}>
        <SideNavigation.Title>{rootLabel}</SideNavigation.Title>
        {items.length > 0 && (
          <SideNavigation.Menu>
            {items.map((item) => {
              const itemActive = isActive(item);
              const itemExpanded = expanded[item.id] ?? false;

              return (
                <SideNavigation.Item key={item.id} active={itemExpanded}>
                  {item.children.length > 0 ? (
                    <>
                      <SideNavigation.Toggle
                        active={itemActive}
                        expanded={itemExpanded}
                        onClick={() => toggleExpand(item.id)}
                        aria-controls={`content-sidenav-${item.id}`}
                        className={getActiveClassName(itemActive)}
                      >
                        {item.label}
                      </SideNavigation.Toggle>
                      {itemExpanded && (
                        <SideNavigation.SubMenu id={`content-sidenav-${item.id}`}>
                          {item.children.map((child) => {
                            const childActive = isActive(child);

                            return (
                              <SideNavigation.SubItem
                                key={child.id}
                                active={childActive}
                              >
                                <SideNavigation.Link
                                  href={getMenuItemHref(child)}
                                  current={childActive}
                                  className={getActiveClassName(childActive)}
                                >
                                  {child.label}
                                  {isExternalMenuItem(
                                    child,
                                    getMenuItemHref(child),
                                  ) && <ExternalMenuIcon />}
                                </SideNavigation.Link>
                              </SideNavigation.SubItem>
                            );
                          })}
                        </SideNavigation.SubMenu>
                      )}
                    </>
                  ) : (
                    <SideNavigation.Link
                      href={getMenuItemHref(item)}
                      current={itemActive}
                      className={getActiveClassName(itemActive)}
                    >
                      {item.label}
                      {isExternalMenuItem(item, getMenuItemHref(item)) && (
                        <ExternalMenuIcon />
                      )}
                    </SideNavigation.Link>
                  )}
                </SideNavigation.Item>
              );
            })}
          </SideNavigation.Menu>
        )}
      </SideNavigation>
    </aside>
  );
}

function getActiveClassName(isActive: boolean): string | undefined {
  return isActive ? 'active selected' : undefined;
}
