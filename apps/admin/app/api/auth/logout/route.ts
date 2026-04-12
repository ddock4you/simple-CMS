import { NextResponse } from 'next/server';

import { deleteSession, logAuditEvent } from '@simple-cms/db';
import type { ApiResponse } from '@simple-cms/types';

import { getSessionCookie, clearSessionCookie } from '@/shared/lib/cookies';
import { getCurrentUser } from '@/entities/auth/lib/getCurrentUser';
import { getAuditContext } from '@/shared/lib/auditHelpers';

export async function POST(request: Request) {
  try {
    const sessionToken = await getSessionCookie();
    const user = await getCurrentUser();

    if (sessionToken) {
      await deleteSession(sessionToken);
    }
    await clearSessionCookie();

    if (user) {
      const auditContext = getAuditContext(request);
      // Fire-and-forget audit log
      logAuditEvent({
        action: 'LOGOUT',
        userId: user.id,
        ipAddress: auditContext.ipAddress,
        userAgent: auditContext.userAgent,
      });
    }

    return NextResponse.json(
      { success: true, data: null } satisfies ApiResponse<null>,
      { status: 200 },
    );
  } catch (error) {
    console.error('[Logout API] Unexpected error:', error);
    await clearSessionCookie();
    return NextResponse.json(
      { success: true, data: null } satisfies ApiResponse<null>,
      { status: 200 },
    );
  }
}
