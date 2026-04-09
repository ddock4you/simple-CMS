import { requireAuth } from '@/entities/auth/lib/getCurrentUser';
import { SidebarProvider, SidebarInset } from '@/shared/ui/sidebar';
import { AppSidebar } from '@/shared/ui/layout/AppSidebar';
import { AdminHeader } from '@/shared/ui/layout/AdminHeader';

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
