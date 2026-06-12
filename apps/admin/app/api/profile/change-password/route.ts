import { NextResponse } from 'next/server';

import bcrypt from 'bcryptjs';

import { prisma, logAuditEvent } from '@simple-cms/db';
import type { ApiResponse } from '@simple-cms/types';

import { withAdminRouteScope } from '@/entities/auth/lib/withAdminRouteScope';
import { changePasswordSchema } from '@/features/auth/model/profileSchema';

export const POST = withAdminRouteScope(async (request, ctx) => {
  try {
    const currentUser = ctx.user;

    const body = await request.json();
    const parsed = changePasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0].message,
        } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const { currentPassword, newPassword } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
    });
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: '사용자를 찾을 수 없습니다.',
        } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return NextResponse.json(
        {
          success: false,
          error: '현재 비밀번호가 올바르지 않습니다.',
        } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: currentUser.id },
      data: { password: hashedPassword },
    });

    logAuditEvent({
      action: 'UPDATE',
      entityType: 'USER',
      entityId: currentUser.id,
      entityTitle: currentUser.username,
      changes: { after: { passwordChanged: true } },
      userId: currentUser.id,
      ipAddress: ctx.auditCtx.ipAddress,
      userAgent: ctx.auditCtx.userAgent,
    });

    return NextResponse.json({
      success: true,
      data: null,
    } satisfies ApiResponse<null>);
  } catch (error) {
    console.error('[Change Password API] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: '비밀번호 변경에 실패했습니다.',
      } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
});
