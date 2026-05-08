import { NextResponse } from 'next/server';

import bcrypt from 'bcryptjs';

import {
  prisma,
  createSession,
  deleteUserSessions,
  deleteExpiredSessions,
  logAuditEvent,
} from '@simple-cms/db';
import type { ApiResponse } from '@simple-cms/types';

import { setSessionCookie } from '@/shared/lib/cookies';
import { getAuditContext } from '@/shared/lib/auditHelpers';

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        {
          success: false,
          error: '아이디와 비밀번호를 입력해주세요.',
        } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const user = await prisma.user.findFirst({
      where: { username },
      include: { role: true },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: '아이디 또는 비밀번호가 올바르지 않습니다.',
        } satisfies ApiResponse<never>,
        { status: 401 },
      );
    }

    if (user.status === 'PENDING') {
      return NextResponse.json(
        {
          success: false,
          error: 'PENDING_APPROVAL',
        } satisfies ApiResponse<never>,
        { status: 403 },
      );
    }

    if (user.status === 'SUSPENDED') {
      await deleteUserSessions(user.id);
      return NextResponse.json(
        {
          success: false,
          error: 'ACCOUNT_SUSPENDED',
        } satisfies ApiResponse<never>,
        { status: 403 },
      );
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json(
        {
          success: false,
          error: '아이디 또는 비밀번호가 올바르지 않습니다.',
        } satisfies ApiResponse<never>,
        { status: 401 },
      );
    }

    const concurrentSetting = await prisma.siteSettings.findFirst({
      where: { key: 'CONCURRENT_LOGIN_ENABLED' },
    });
    if (concurrentSetting?.value === 'false') {
      await deleteUserSessions(user.id);
    }

    const auditContext = getAuditContext(request);
    const session = await createSession(user.id, {
      ipAddress: auditContext.ipAddress ?? undefined,
      userAgent: auditContext.userAgent ?? undefined,
    });

    await setSessionCookie(session.sessionToken);

    // Fire-and-forget audit log
    logAuditEvent({
      action: 'LOGIN',
      userId: user.id,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
    });

    // Fire-and-forget expired session cleanup
    deleteExpiredSessions().catch(() => null);

    const { password: _, ...safeUser } = user;
    return NextResponse.json(
      { success: true, data: { user: safeUser } } satisfies ApiResponse<{
        user: typeof safeUser;
      }>,
      { status: 200 },
    );
  } catch (error) {
    console.error('[Login API] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: '로그인 처리 중 오류가 발생했습니다.',
      } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
