import { Suspense } from 'react';
import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/entities/auth/lib/getCurrentUser';
import { RegisterForm } from '@/features/auth/ui/RegisterForm';

export default async function RegisterPage() {
  // 시연 모드: 회원가입 폼 노출 금지 — visitor는 demo_admin으로 자동 입장.
  if (process.env.DEMO_MODE === 'true') {
    redirect('/dashboard');
  }

  const user = await getCurrentUser();
  if (user) redirect('/dashboard');

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40">
      <Suspense>
        <RegisterForm />
      </Suspense>
    </main>
  );
}
