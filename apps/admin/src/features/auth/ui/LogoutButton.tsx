'use client';

import { useRouter } from 'next/navigation';

import { logout } from '@/shared/api/authHelpers';
import { Button } from '@/shared/ui/Button';

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await logout().catch(() => null);
    router.push('/login');
  };

  return (
    <Button variant="outline" onClick={handleLogout}>
      로그아웃
    </Button>
  );
}
