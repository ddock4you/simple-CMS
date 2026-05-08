import type { PermissionMap } from '@simple-cms/types';

import { requireAuth } from '@/entities/auth/lib/getCurrentUser';
import { PermissionProvider } from '@/entities/auth/ui/PermissionProvider';
import { SidebarProvider, SidebarInset } from '@/shared/ui/shadcn/sidebar';
import { AppSidebar } from '@/shared/ui/layout/AppSidebar';
import { AdminHeader } from '@/widgets/admin-header/ui/AdminHeader';
import { CommandPalette } from '@/features/quick-switcher/ui/CommandPalette';
import { ensureDemoSession } from '@/shared/lib/ensureDemoSession';
import { getCurrentPathname } from '@/shared/lib/getCurrentPathname';

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 시연 모드: cookie 검증 + sessionId 부착, 없으면 splash로 redirect.
  // 운영 모드(DEMO_MODE 미설정): no-op.
  const currentPath = await getCurrentPathname();
  await ensureDemoSession(currentPath);

  const user = await requireAuth();

  const layoutUser = {
    name: user.name,
    username: user.username,
    role: user.role
      ? { name: user.role.name, isSystem: user.role.isSystem, permissions: user.role.permissions }
      : null,
  };

  return (
    <SidebarProvider>
      <AppSidebar user={layoutUser} />
      <SidebarInset>
        <AdminHeader user={layoutUser} />
        <div className="flex-1 p-6">
          <PermissionProvider
            permissions={(layoutUser.role?.permissions ?? {}) as PermissionMap}
            isSystem={layoutUser.role?.isSystem ?? false}
          >
            {children}
            <CommandPalette />
          </PermissionProvider>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
