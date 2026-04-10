import { NextResponse } from 'next/server';

import type { ApiResponse } from '@simple-cms/types';
import type { ResourceKey, Action } from '@simple-cms/types';

import { getCurrentUser } from '@/entities/auth/lib/getCurrentUser';
import { hasPermission } from '@/entities/auth/lib/checkPermission';
import type { SessionUser } from '@/entities/auth/model/auth.types';

export async function requirePermission(
  resource: ResourceKey,
  action: Action,
): Promise<
  | { user: SessionUser; error: null }
  | { user: null; error: NextResponse }
> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      user: null,
      error: NextResponse.json(
        { success: false, error: '인증이 필요합니다.' } satisfies ApiResponse<never>,
        { status: 401 },
      ),
    };
  }

  if (!hasPermission(user, resource, action)) {
    return {
      user: null,
      error: NextResponse.json(
        { success: false, error: '권한이 없습니다.' } satisfies ApiResponse<never>,
        { status: 403 },
      ),
    };
  }

  return { user, error: null };
}
