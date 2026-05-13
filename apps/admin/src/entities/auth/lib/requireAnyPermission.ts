import { NextResponse } from 'next/server';

import type { ApiResponse } from '@simple-cms/types';
import type { ResourceKey, Action } from '@simple-cms/types';

import { getCurrentUser } from '@/entities/auth/lib/getCurrentUser';
import { hasPermission } from '@/entities/auth/lib/checkPermission';
import type { SessionUser } from '@/entities/auth/model/auth.types';

export interface PermissionCheck {
  resource: ResourceKey;
  action: Action;
}

/**
 * 멀티 리소스 OR 권한 체크.
 * 인증 필수 + 주어진 권한 중 하나 이상을 가져야 통과.
 * quick-search처럼 여러 도메인 중 하나라도 조회 권한이 있으면 유의미한 응답을 줄 수 있는 API에서 사용.
 */
export async function requireAnyPermission(
  checks: ReadonlyArray<PermissionCheck>,
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

  const hasAny = checks.some(({ resource, action }) =>
    hasPermission(user, resource, action),
  );

  if (!hasAny) {
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
