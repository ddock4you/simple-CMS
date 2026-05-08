/**
 * 시연 모드 즉시 reset 엔드포인트.
 *
 * POST /_cms/admin/api/demo/reset
 *   - DEMO_MODE !== 'true'  → 404
 *   - 쿠키 없음 또는 만료    → 200 + 그냥 redirectTo (이미 정리할 게 없음)
 *   - 정상                  → 200 + redirectTo: '/demo-bootstrap'
 *
 * visitor가 DemoBanner의 [새 세션 시작] 버튼을 누를 때 호출.
 * 현재 sessionId의 모든 격리 데이터 + Storage + Session 즉시 정리.
 *
 * 감사 로그 미기록 — visitor 액션이지만 익명 입수 트래픽이고 격리 데이터 자체가 정리됨.
 */
import { NextResponse } from 'next/server';

import { demo, prisma, cleanupExpiredSessions } from '@simple-cms/db';
import type { ApiResponse } from '@simple-cms/types';

import { clearSessionCookie, getSessionCookie } from '@/shared/lib/cookies';
import { getStorageAdapter } from '@/shared/lib/storage';
import { SupabaseStorageAdapter } from '@/shared/lib/storage/supabaseAdapter';

interface ResetResponse {
  redirectTo: string;
}

const REDIRECT_TO = '/demo-bootstrap';

export async function POST(): Promise<NextResponse<ApiResponse<ResetResponse>>> {
  if (process.env.DEMO_MODE !== 'true') {
    return NextResponse.json(
      { success: false, error: 'Not Found' } satisfies ApiResponse<never>,
      { status: 404 },
    );
  }

  const token = await getSessionCookie();
  if (!token) {
    return NextResponse.json(
      {
        success: true,
        data: { redirectTo: REDIRECT_TO },
      } satisfies ApiResponse<ResetResponse>,
      { status: 200 },
    );
  }

  // 현재 visitor의 격리 sessionId 회수 (Session.user.sessionId)
  const session = await demo.runWithBypass(() =>
    prisma.session.findUnique({
      where: { sessionToken: token },
      select: { id: true, user: { select: { sessionId: true } } },
    }),
  );

  await clearSessionCookie();

  if (!session) {
    // 이미 만료되어 정리됐을 수 있음 — 쿠키만 지우고 splash로
    return NextResponse.json(
      {
        success: true,
        data: { redirectTo: REDIRECT_TO },
      } satisfies ApiResponse<ResetResponse>,
      { status: 200 },
    );
  }

  const isolationId = session.user.sessionId;
  if (demo.RESERVED_SESSION_IDS.has(isolationId)) {
    // 운영(__PROD__)이나 시드(__SEED__) 세션을 visitor가 가진 비정상 케이스 방어
    return NextResponse.json(
      {
        success: true,
        data: { redirectTo: REDIRECT_TO },
      } satisfies ApiResponse<ResetResponse>,
      { status: 200 },
    );
  }

  const adapter = getStorageAdapter();
  const cleanupStorage =
    adapter instanceof SupabaseStorageAdapter
      ? adapter.cleanupSessionFolder.bind(adapter)
      : undefined;

  try {
    await cleanupExpiredSessions({
      cleanupStorage,
      forceSessionIds: [isolationId],
    });
  } catch (error) {
    console.error('[Demo Reset] Unexpected error:', error);
    // visitor에게는 splash로 보낸다 — 다음 진입에서 새 세션 발급
  }

  return NextResponse.json(
    {
      success: true,
      data: { redirectTo: REDIRECT_TO },
    } satisfies ApiResponse<ResetResponse>,
    { status: 200 },
  );
}
