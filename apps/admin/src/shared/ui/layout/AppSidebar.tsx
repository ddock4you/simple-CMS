import { Command } from 'lucide-react';
import Link from 'next/link';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/shared/ui/shadcn/sidebar';
import {
  SidebarMainNav,
  SidebarNavGroups,
} from '@/shared/ui/layout/SidebarNavContent';
import { UserNavFooter } from '@/shared/ui/layout/UserNavFooter';

interface AppSidebarProps {
  user: {
    name: string;
    username: string;
    role: { name: string; isSystem: boolean; permissions: unknown } | null;
  };
}

export function AppSidebar({ user }: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/dashboard" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <Command className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">Simple CMS</span>
                <span className="truncate text-xs text-muted-foreground">
                  관리자
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMainNav user={user} />
        <SidebarNavGroups user={user} />
      </SidebarContent>
      <SidebarFooter>
        <UserNavFooter user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
