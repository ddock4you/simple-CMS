import { NextResponse } from 'next/server';

import { buildDemoSessionDiagnostics } from '@/shared/lib/demoSessionDiagnostics';
import { runWithRequestDemoSession } from '@/shared/lib/requestDemoSession';

export const runtime = 'nodejs';

export async function GET(request: Request): Promise<NextResponse> {
  if (process.env.DEMO_MODE !== 'true') {
    return NextResponse.json(
      { success: false, error: 'Not found' },
      { status: 404 },
    );
  }

  return runWithRequestDemoSession(request, async (session) => {
    const diagnostics = await buildDemoSessionDiagnostics(session);
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
