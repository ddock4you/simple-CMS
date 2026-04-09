import type { ApiResponse } from '@simple-cms/types';
import { DB_PACKAGE_READY } from '@simple-cms/db';

type HealthCheck = { status: string; db: boolean };

export default function HomePage() {
  const health: ApiResponse<HealthCheck> = {
    success: true,
    data: { status: 'ok', db: DB_PACKAGE_READY },
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-2xl font-bold">Simple CMS Admin</h1>
      <p className="mt-2 text-gray-500">Stage 1 — 기초 환경 구축 완료</p>
      <pre className="mt-4 rounded bg-gray-100 p-4 text-sm">
        {JSON.stringify(health, null, 2)}
      </pre>
    </main>
  );
}
