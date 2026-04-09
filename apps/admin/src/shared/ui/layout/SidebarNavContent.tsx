'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { NAV_MAIN, NAV_GROUPS } from '@/shared/config/navigation';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/shared/ui/sidebar';

function isActive(pathname: string | null, url: string): boolean {
  if (!pathname) return false;
  if (url === '/dashboard') return pathname === '/dashboard';
  return pathname === url || pathname.startsWith(url + '/');
}

export function SidebarMainNav() {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {NAV_MAIN.map((item) => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton
                render={<Link href={item.url} />}
                isActive={isActive(pathname, item.url)}
              >
                <item.icon />
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function SidebarNavGroups() {
  const pathname = usePathname();

  return (
    <>
      {NAV_GROUPS.map((group) => (
        <SidebarGroup key={group.label}>
          <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {group.items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    render={<Link href={item.url} />}
                    isActive={isActive(pathname, item.url)}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
}
