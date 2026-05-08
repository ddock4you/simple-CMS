import { NextResponse } from 'next/server';

import bcrypt from 'bcryptjs';

import { prisma, logAuditEvent } from '@simple-cms/db';
import type { ApiResponse } from '@simple-cms/types';

import { getAuditContext } from '@/shared/lib/auditHelpers';
import { registerSchema } from '@/features/auth/model/registerSchema';

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();
    const result = registerSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error.issues[0].message,
        } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const { username, email, password, name } = result.data;

    const existingUsername = await prisma.user.findFirst({
      where: { username },
    });
    if (existingUsername) {
      return NextResponse.json(
        {
          success: false,
          error: '이미 사용 중인 아이디입니다.',
        } satisfies ApiResponse<never>,
        { status: 409 },
      );
    }

    if (email) {
      const existingEmail = await prisma.user.findFirst({
        where: { email },
      });
      if (existingEmail) {
        return NextResponse.json(
          {
            success: false,
            error: '이미 사용 중인 이메일입니다.',
          } satisfies ApiResponse<never>,
          { status: 409 },
        );
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        username,
        email: email ?? null,
        password: hashedPassword,
        name,
      },
    });

    const auditContext = getAuditContext(request);
    logAuditEvent({
      action: 'CREATE',
      entityType: 'USER',
      entityId: newUser.id,
      entityTitle: username,
      changes: {
        after: { username, name, status: 'PENDING' },
      },
      userId: null,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          message:
            '가입 신청이 완료되었습니다. 관리자 승인 후 로그인이 가능합니다.',
        },
      } satisfies ApiResponse<{ message: string }>,
      { status: 201 },
    );
  } catch (error) {
    if (
      error instanceof Error &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      const target =
        ((error as { meta?: { target?: string[] } }).meta?.target as
          | string[]
          | undefined) ?? [];
      if (target.includes('username')) {
        return NextResponse.json(
          {
            success: false,
            error: '이미 사용 중인 아이디입니다.',
          } satisfies ApiResponse<never>,
          { status: 409 },
        );
      }
      if (target.includes('email')) {
        return NextResponse.json(
          {
            success: false,
            error: '이미 사용 중인 이메일입니다.',
          } satisfies ApiResponse<never>,
          { status: 409 },
        );
      }
    }

    console.error('[Register API] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: '회원가입 처리 중 오류가 발생했습니다.',
      } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
