import { NextResponse } from 'next/server';

import { prisma, logAuditEvent } from '@simple-cms/db';
import type { ApiResponse } from '@simple-cms/types';

import { withAdminRouteScope } from '@/shared/api/withAdminRouteScope';
import { profileSchema } from '@/features/auth/model/profileSchema';

export const PATCH = withAdminRouteScope(async (request, ctx) => {
  try {
    const currentUser = ctx.user;

    const body = await request.json();
    const parsed = profileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0].message,
        } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const { name, email } = parsed.data;

    if (email && email !== currentUser.email) {
      const existingEmail = await prisma.user.findFirst({
        where: { email },
      });
      if (existingEmail && existingEmail.id !== currentUser.id) {
        return NextResponse.json(
          {
            success: false,
            error: '이미 사용 중인 이메일입니다.',
          } satisfies ApiResponse<never>,
          { status: 409 },
        );
      }
    }

    const before: Record<string, string | null> = {};
    const after: Record<string, string | null> = {};

    if (name !== currentUser.name) {
      before.name = currentUser.name;
      after.name = name;
    }
    if ((email ?? null) !== currentUser.email) {
      before.email = currentUser.email;
      after.email = email ?? null;
    }

    await prisma.user.update({
      where: { id: currentUser.id },
      data: { name, email: email ?? null },
    });

    if (Object.keys(after).length > 0) {
      logAuditEvent({
        action: 'UPDATE',
        entityType: 'USER',
        entityId: currentUser.id,
        entityTitle: currentUser.username,
        changes: { before, after },
        userId: currentUser.id,
        ipAddress: ctx.auditCtx.ipAddress,
        userAgent: ctx.auditCtx.userAgent,
      });
    }

    return NextResponse.json({
      success: true,
      data: null,
    } satisfies ApiResponse<null>);
  } catch (error) {
    if (
      error instanceof Error &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      return NextResponse.json(
        {
          success: false,
          error: '이미 사용 중인 이메일입니다.',
        } satisfies ApiResponse<never>,
        { status: 409 },
      );
    }

    console.error('[Profile API] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: '프로필 변경에 실패했습니다.',
      } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
});
