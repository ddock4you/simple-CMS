import { NextResponse } from 'next/server';

import { prisma } from '@simple-cms/db';
import type { ApiResponse, PaginatedResponse } from '@simple-cms/types';

import { getCurrentUser } from '@/entities/auth/lib/getCurrentUser';
import { userListQuerySchema } from '@/features/user-management/schemas/userSchemas';
import type { UserListItem } from '@/features/user-management/model/userFilters';

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다.' } satisfies ApiResponse<never>,
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const parsed = userListQuerySchema.safeParse({
      status: searchParams.get('status') ?? undefined,
      page: searchParams.get('page') ?? undefined,
      pageSize: searchParams.get('pageSize') ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const { status, page, pageSize } = parsed.data;
    const where = status === 'ALL' ? {} : { status: status as 'PENDING' | 'ACTIVE' | 'SUSPENDED' };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          name: true,
          email: true,
          status: true,
          createdAt: true,
          role: {
            select: { id: true, name: true, isSystem: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count({ where }),
    ]);

    const items: UserListItem[] = users.map((u) => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
    }));

    return NextResponse.json(
      {
        success: true,
        data: { items, total, page, pageSize },
      } satisfies ApiResponse<PaginatedResponse<UserListItem>>,
    );
  } catch (error) {
    console.error('[Users API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: '사용자 목록 조회에 실패했습니다.' } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
