/**
 * 시연 모드 자동 부트스트랩 splash 페이지 (admin 버전).
 *
 * 사용자가 직접 admin URL(`/_cms/admin/dashboard` 등)로 진입했을 때 admin layout gate가
 * 이 페이지로 redirect한다. Next.js basePath('/_cms/admin')가 절대 경로에 자동 prepend
 * 되므로 admin redirect는 admin origin의 splash로 향한다 — 따라서 admin과 web 둘 다
 * 동일 splash 라우트를 둔다.
 *
 * (authenticated) 그룹 밖이라 인증 없이 접근 가능. root layout만 통과(ensureDemoSession 미호출).
 */
import { notFound } from 'next/navigation';

import { DEMO_ADMIN_BASE_PATH } from '@simple-cms/types';

import { DemoBootstrapClient } from './DemoBootstrapClient';

interface DemoBootstrapPageProps {
  searchParams: Promise<{ next?: string }>;
}

function sanitizeNextPath(raw: string | undefined): string {
  const fallbackPath = `${DEMO_ADMIN_BASE_PATH}/dashboard`;
  if (!raw) return fallbackPath;
  // open redirect 방어
  if (!raw.startsWith('/') || raw.startsWith('//')) {
    return fallbackPath;
  }
  return raw;
}

export const dynamic = 'force-dynamic';

export default async function DemoBootstrapPage({
  searchParams,
}: DemoBootstrapPageProps) {
  if (process.env.DEMO_MODE !== 'true') {
    notFound();
  }
  const params = await searchParams;
  const nextPath = sanitizeNextPath(params.next);

  return <DemoBootstrapClient nextPath={nextPath} />;
}
