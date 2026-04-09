import { requireAuth } from '@/entities/auth/lib/getCurrentUser';
import { LogoutButton } from '@/features/auth/ui/LogoutButton';

export default async function DashboardPage() {
  const user = await requireAuth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-bold">대시보드</h1>
      <p className="text-muted-foreground">
        환영합니다, {user.name || user.username}님
      </p>
      <p className="text-sm text-muted-foreground">
        역할: {user.role?.name ?? '미배정'}
      </p>
      <LogoutButton />
    </main>
  );
}
