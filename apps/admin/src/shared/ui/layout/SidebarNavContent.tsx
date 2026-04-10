'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { getVisibleMenuItems } from '@/shared/lib/sidebarPermissions';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/shared/ui/shadcn/sidebar';

function isActive(pathname: string | null, url: string): boolean {
  if (!pathname) return false;
  if (url === '/dashboard') return pathname === '/dashboard';
  return pathname === url || pathname.startsWith(url + '/');
}

interface SidebarUser {
  role: {
    isSystem: boolean;
    permissions: unknown;
  } | null;
}

export function SidebarMainNav({ user }: { user: SidebarUser | null }) {
  const pathname = usePathname();
  const { main } = getVisibleMenuItems(user);

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {main.map((item) => (
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

export function SidebarNavGroups({ user }: { user: SidebarUser | null }) {
  const pathname = usePathname();
  const { groups } = getVisibleMenuItems(user);

  return (
    <>
      {groups.map((group) => (
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
