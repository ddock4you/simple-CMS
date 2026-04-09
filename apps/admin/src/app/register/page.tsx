import { Suspense } from 'react';
import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/entities/auth/lib/getCurrentUser';
import { RegisterForm } from '@/features/auth/ui/RegisterForm';

export default async function RegisterPage() {
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
