/**
 * 시연 모드 자동 부트스트랩 splash 페이지.
 *
 * 시크릿 창 첫 방문에 layout gate가 redirect하는 진입점. Server Component로 DEMO_MODE
 * 가드 + `next` 파라미터 정규화만 처리하고 실제 부트스트랩은 Client Component에 위임.
 *
 * - DEMO_MODE !== 'true' → notFound() (404)
 * - next 파라미터: 외부 URL 차단 (open redirect 방어), 빈 값/없음 → '/'로 정규화
 */
import { notFound } from 'next/navigation';

import { DemoBootstrapClient } from './DemoBootstrapClient';

interface DemoBootstrapPageProps {
  searchParams: Promise<{ next?: string }>;
}

function sanitizeNextPath(raw: string | undefined): string {
  if (!raw) return '/';
  // open redirect 방어 — 절대 URL / scheme-relative 차단
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/';
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
