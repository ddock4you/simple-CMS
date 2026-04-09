import { Suspense } from 'react';
import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/entities/auth/lib/getCurrentUser';
import { LoginForm } from '@/features/auth/ui/LoginForm';

export default async function LoginPage() {
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
