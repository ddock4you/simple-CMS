import { NextResponse } from 'next/server';

import { prisma } from '@simple-cms/db';
import type { ApiResponse } from '@simple-cms/types';

import { getCurrentUser } from '@/entities/auth/lib/getCurrentUser';
import type { RoleListItem } from '@/features/user-management/model/userFilters';

export async function GET(): Promise<NextResponse> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다.' } satisfies ApiResponse<never>,
        { status: 401 },
      );
    }

    const roles = await prisma.role.findMany({
      select: { id: true, name: true, isSystem: true, isDefault: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(
      { success: true, data: roles } satisfies ApiResponse<RoleListItem[]>,
    );
  } catch (error) {
    console.error('[Roles API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: '역할 목록 조회에 실패했습니다.' } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
