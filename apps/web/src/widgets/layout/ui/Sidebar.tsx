'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { SideNavigation } from 'krds-react';

import type { FilteredMenuItem } from '@/entities/navigation/lib/filterMenuItems';
import { getMenuItemHref } from '@/entities/navigation/lib/getMenuItemHref';

interface SidebarProps {
  items: FilteredMenuItem[];
}

export function Sidebar({ items }: SidebarProps) {
  const pathname = usePathname() ?? '';
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    // 초기 상태: 현재 경로에 해당하는 메뉴를 펼침
    const initial: Record<string, boolean> = {};
    for (const item of items) {
      if (hasActiveChild(item, pathname)) {
        initial[item.id] = true;
        for (const child of item.children) {
          if (hasActiveChild(child, pathname)) {
            initial[child.id] = true;
          }
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
    <aside className="sidebar-nav" style={{ width: '16rem', flexShrink: 0, paddingTop: '2rem' }}>
      <SideNavigation aria-label="사이드 메뉴">
        <SideNavigation.Menu>
          {items.map((item) => (
            <SideNavigation.Item key={item.id} active={isActive(item) || hasActiveChild(item, pathname)}>
              {item.children.length > 0 ? (
                <>
                  <SideNavigation.Toggle
                    expanded={expanded[item.id] ?? false}
                    onClick={() => toggleExpand(item.id)}
                    aria-controls={`sidenav-${item.id}`}
                  >
                    {item.label}
                  </SideNavigation.Toggle>
                  {(expanded[item.id] ?? false) && (
                    <SideNavigation.SubMenu id={`sidenav-${item.id}`}>
                      {item.children.map((child) => (
                        <SideNavigation.Item key={child.id} active={isActive(child) || hasActiveChild(child, pathname)}>
                          {child.children.length > 0 ? (
                            <>
                              <SideNavigation.Toggle
                                expanded={expanded[child.id] ?? false}
                                onClick={() => toggleExpand(child.id)}
                                aria-controls={`sidenav-${child.id}`}
                              >
                                {child.label}
                              </SideNavigation.Toggle>
                              {(expanded[child.id] ?? false) && (
                                <SideNavigation.SubMenu id={`sidenav-${child.id}`}>
                                  {child.children.map((grandchild) => (
                                    <SideNavigation.SubItem key={grandchild.id} active={isActive(grandchild)}>
                                      <SideNavigation.Link
                                        href={getMenuItemHref(grandchild)}
                                        current={isActive(grandchild)}
                                      >
                                        {grandchild.label}
                                      </SideNavigation.Link>
                                    </SideNavigation.SubItem>
                                  ))}
                                </SideNavigation.SubMenu>
                              )}
                            </>
                          ) : (
                            <SideNavigation.Link
                              href={getMenuItemHref(child)}
                              current={isActive(child)}
                            >
                              {child.label}
                            </SideNavigation.Link>
                          )}
                        </SideNavigation.Item>
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
      </SideNavigation>
    </aside>
  );
}

function hasActiveChild(item: FilteredMenuItem, pathname: string): boolean {
  const href = getMenuItemHref(item);
  if (href !== '#' && pathname === href) return true;
  return item.children.some((child) => hasActiveChild(child, pathname));
}
