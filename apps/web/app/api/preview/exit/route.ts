import { NextResponse } from 'next/server';

import { clearPreviewCookie } from '@/shared/lib/previewCookies';

export const runtime = 'nodejs';

/**
 * POST /api/preview/exit
 *
 * preview 쿠키 삭제. PreviewBanner의 [종료] 버튼이 호출.
 */
export async function POST(): Promise<NextResponse> {
  const response = NextResponse.json({ success: true, data: null });
  clearPreviewCookie(response);
  return response;
}
