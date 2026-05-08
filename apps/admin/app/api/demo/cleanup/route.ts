/**
 * 시연 모드 cleanup 엔드포인트.
 *
 * GET/POST /_cms/admin/api/demo/cleanup
 *   - DEMO_MODE !== 'true'                 → 503
 *   - Authorization 헤더 부재/불일치        → 401
 *   - 정상                                  → 200 + 결과 JSON
 *
 * 인증: `Authorization: Bearer ${CRON_SECRET}` 헤더만 허용.
 *   Vercel cron이 자동 부착한다 (env에 CRON_SECRET 설정 시).
 *   query string secret은 URL 노출 위험으로 미지원.
 *
 * 호출 경로:
 *   - Vercel Hobby cron (vercel.json: "0 3 * * *" UTC = KST 12:00 일 1회)
 *   - 운영자 수동 디버깅 (curl)
 *
 * 감사 로그 미기록 — 자동 정리 잡은 운영자 액션이 아니다.
 */
import { NextResponse } from 'next/server';

import { cleanupExpiredSessions } from '@simple-cms/db';
import type { ApiResponse } from '@simple-cms/types';

import { getStorageAdapter } from '@/shared/lib/storage';
import { SupabaseStorageAdapter } from '@/shared/lib/storage/supabaseAdapter';

interface CleanupResponse {
  sessionsScanned: number;
  sessionsDeleted: number;
  rowsDeletedByModel: Record<string, number>;
  storageFilesDeleted: number;
  errors: string[];
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function handle(
  request: Request,
): Promise<NextResponse<ApiResponse<CleanupResponse>>> {
  if (process.env.DEMO_MODE !== 'true') {
    return NextResponse.json(
      {
        success: false,
        error: '시연 모드가 활성화되지 않았습니다.',
      } satisfies ApiResponse<never>,
      { status: 503 },
    );
  }

  const expected = process.env.CRON_SECRET;
  if (!expected) {
    console.error('[Demo Cleanup] CRON_SECRET 환경변수가 설정되지 않음');
    return NextResponse.json(
      {
        success: false,
        error: 'CRON_SECRET이 설정되지 않았습니다.',
      } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }

  const authHeader = request.headers.get('authorization') ?? '';
  const provided = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : '';

  if (!provided || !timingSafeEqual(provided, expected)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' } satisfies ApiResponse<never>,
      { status: 401 },
    );
  }

  // Storage 정리 콜백 — Supabase 어댑터일 때만 실제 정리, 외엔 no-op
  const adapter = getStorageAdapter();
  const cleanupStorage =
    adapter instanceof SupabaseStorageAdapter
      ? adapter.cleanupSessionFolder.bind(adapter)
      : undefined;

  try {
    const result = await cleanupExpiredSessions({ cleanupStorage });
    return NextResponse.json(
      {
        success: true,
        data: result,
      } satisfies ApiResponse<CleanupResponse>,
      { status: 200 },
    );
  } catch (error) {
    console.error('[Demo Cleanup] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: '시연 데이터 정리 중 오류가 발생했습니다.',
      } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}

export async function GET(
  request: Request,
): Promise<NextResponse<ApiResponse<CleanupResponse>>> {
  return handle(request);
}

export async function POST(
  request: Request,
): Promise<NextResponse<ApiResponse<CleanupResponse>>> {
  return handle(request);
}
