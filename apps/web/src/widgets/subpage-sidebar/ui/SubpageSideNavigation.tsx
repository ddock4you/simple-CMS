'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { SideNavigation } from 'krds-react';

import type { FilteredMenuItem } from '@/entities/navigation/lib/filterMenuItems';
import { getMenuItemHref } from '@/entities/navigation/lib/getMenuItemHref';

interface SubpageSideNavigationProps {
  rootLabel: string;
  items: FilteredMenuItem[];
}

export function SubpageSideNavigation({
  rootLabel,
  items,
}: SubpageSideNavigationProps) {
  const pathname = usePathname() ?? '';

  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const item of items) {
      if (hasActiveChild(item, pathname)) {
        initial[item.id] = true;
        for (const child of item.children) {
          if (hasActiveChild(child, pathname)) initial[child.id] = true;
        }
      }
    }
    return initial;
  });

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const isActive = (item: FilteredMenuItem) => {
    const href = getMenuItemHref(item);
    return href !== '#' && pathname === href;
  };

  return (
    <aside className="subpage-side-nav" aria-label={`${rootLabel} 하위 메뉴`}>
      <SideNavigation aria-label={`${rootLabel} 하위 메뉴`}>
        <SideNavigation.Title>{rootLabel}</SideNavigation.Title>
        {items.length > 0 && (
          <SideNavigation.Menu>
            {items.map((item) => (
              <SideNavigation.Item
                key={item.id}
                active={isActive(item) || hasActiveChild(item, pathname)}
              >
                {item.children.length > 0 ? (
                  <>
                    <SideNavigation.Toggle
                      expanded={expanded[item.id] ?? false}
                      onClick={() => toggleExpand(item.id)}
                      aria-controls={`subpage-sidenav-${item.id}`}
                    >
                      {item.label}
                    </SideNavigation.Toggle>
                    {(expanded[item.id] ?? false) && (
                      <SideNavigation.SubMenu
                        id={`subpage-sidenav-${item.id}`}
                      >
                        {item.children.map((child) => (
                          <SideNavigation.SubItem
                            key={child.id}
                            active={isActive(child)}
                          >
                            <SideNavigation.Link
                              href={getMenuItemHref(child)}
                              current={isActive(child)}
                            >
                              {child.label}
                            </SideNavigation.Link>
                          </SideNavigation.SubItem>
                        ))}
                      </SideNavigation.SubMenu>
                    )}
                  </>
                ) : (
                  <SideNavigation.Link
                    href={getMenuItemHref(item)}
                    current={isActive(item)}
                  >
                    {item.label}
                  </SideNavigation.Link>
                )}
              </SideNavigation.Item>
            ))}
          </SideNavigation.Menu>
        )}
      </SideNavigation>
    </aside>
  );
}

function hasActiveChild(item: FilteredMenuItem, pathname: string): boolean {
  const href = getMenuItemHref(item);
  if (href !== '#' && pathname === href) return true;
  return item.children.some((child) => hasActiveChild(child, pathname));
}
