import { Suspense } from 'react';
import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/entities/auth/lib/getCurrentUser';
import { LoginForm } from '@/features/auth/ui/LoginForm';

export default async function LoginPage() {
  // 시연 모드: 로그인 폼 노출 금지 — 자동 진입 흐름과 일관성. /dashboard로 보내면
  // (authenticated) layout의 ensureDemoSession이 cookie 검증/splash redirect 처리.
  if (process.env.DEMO_MODE === 'true') {
    redirect('/dashboard');
  }

  const user = await getCurrentUser();
  if (user) redirect('/dashboard');

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
