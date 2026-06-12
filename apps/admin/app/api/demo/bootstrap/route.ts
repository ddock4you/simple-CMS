/**
 * 시연 모드 자동 세션 부트스트랩 엔드포인트.
 *
 * POST /_cms/admin/api/demo/bootstrap
 *   - DEMO_MODE !== 'true'                 → 404
 *   - __SEED__ 미존재(SeedNotFoundError)    → 503 + { code: 'SEED_NOT_FOUND' }
 *   - 클론/세션 실패                          → 500
 *   - 정상                                  → 200 + Set-Cookie(session-token, HttpOnly, 1h)
 *
 * 처리 순서:
 *   1. 새 cuid sessionId 발급
 *   2. demo.runWithBypass 안에서 cloneSeedToSession 호출 → 14모델 row + demoAdminId 반환
 *   3. createSession(demoAdminId) — Session은 EXCLUDED라 sessionId 무관
 *   4. setSessionCookie(token)
 *   5. JSON 응답 (data: { sessionId })
 *
 * 감사 로그 미기록 — 시연 부트스트랩은 운영자 액션이 아니라 anonymous 입수 트래픽이고
 * sessionId 자체가 추적 ID 역할 (PR4 후속에서 cleanup cron이 정리).
 */
import { randomUUID } from 'node:crypto';

import { NextResponse } from 'next/server';

import {
  createSession,
  demo,
  cloneSeedToSession,
  SeedNotFoundError,
} from '@simple-cms/db';
import type { ApiResponse } from '@simple-cms/types';

import { setSessionCookie } from '@/shared/lib/cookies';
import { getAuditContext } from '@/shared/lib/auditHelpers';

interface BootstrapResponse {
  sessionId: string;
}

export async function POST(
  request: Request,
): Promise<NextResponse<ApiResponse<BootstrapResponse>>> {
  if (process.env.DEMO_MODE !== 'true') {
    return NextResponse.json(
      { success: false, error: 'Not Found' } satisfies ApiResponse<never>,
      { status: 404 },
    );
  }

  try {
    // sessionId는 visitor 격리 식별자 — UUID로 충분 (cuid 형식 강제 아님)
    const newSessionId = randomUUID();

    const { demoAdminId } = await demo.runWithBypass(() =>
      cloneSeedToSession(newSessionId),
    );

    const auditContext = getAuditContext(request);
    const session = await createSession(demoAdminId, {
      ipAddress: auditContext.ipAddress ?? undefined,
      userAgent: auditContext.userAgent ?? undefined,
    });

    await setSessionCookie(session.sessionToken);

    return NextResponse.json(
      {
        success: true,
        data: { sessionId: newSessionId },
      } satisfies ApiResponse<BootstrapResponse>,
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof SeedNotFoundError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: error.code,
        } satisfies ApiResponse<never>,
        { status: 503 },
      );
    }
    console.error('[Demo Bootstrap] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: '시연 세션 생성 중 오류가 발생했습니다.',
      } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
