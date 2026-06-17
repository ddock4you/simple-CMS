import { NextResponse } from 'next/server';

import { buildDemoSessionDiagnostics } from '@/shared/lib/demoSessionDiagnostics';
import { runWithRequestDemoSession } from '@/shared/lib/requestDemoSession';

export const runtime = 'nodejs';

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function isDiagnosticsAuthorized(request: Request): boolean {
  if (process.env.DEMO_SESSION_DEBUG === 'true') {
    return true;
  }

  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return false;
  }

  const authHeader = request.headers.get('authorization') ?? '';
  const provided = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : '';

  return Boolean(provided) && timingSafeEqual(provided, expected);
}

function hiddenResponse(): NextResponse {
  return NextResponse.json(
    { success: false, error: 'Not found' },
    { status: 404, headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function GET(request: Request): Promise<NextResponse> {
  if (process.env.DEMO_MODE !== 'true') {
    return hiddenResponse();
  }

  if (!isDiagnosticsAuthorized(request)) {
    return hiddenResponse();
  }

  return runWithRequestDemoSession(request, async (session) => {
    const requestUrl = new URL(request.url);
    const diagnostics = await buildDemoSessionDiagnostics(
      session,
      requestUrl.searchParams.get('q'),
    );
    const response = NextResponse.json(
      { success: true, data: diagnostics },
      {
        status: session ? 200 : 401,
        headers: { 'Cache-Control': 'no-store' },
      },
    );

    response.headers.set(
      'X-Demo-Session-Id',
      diagnostics.sessionId ?? 'none',
    );
    response.headers.set(
      'X-Demo-Current-Session-Id',
      diagnostics.currentSessionId,
    );

    return response;
  });
}
