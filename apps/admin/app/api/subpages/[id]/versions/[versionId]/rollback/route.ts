import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  prisma,
  logAuditEvent,
  restoreSubpageFromVersion,
  RevisionMismatchError,
  SubpageVersionNotFoundError,
  SubpageVersionSlugConflictError,
} from '@simple-cms/db';
import type { ApiResponse } from '@simple-cms/types';

import { requirePermission } from '@/entities/auth/lib/requirePermission';
import { getAuditContext } from '@/shared/lib/auditHelpers';
import { recalculateSubpageContent } from '@/shared/lib/blockContentRecalculation';

const rollbackSchema = z.object({
  expectedRevision: z.number().int().nonnegative(),
  statusStrategy: z.enum(['KEEP_CURRENT', 'APPLY_VERSION']).optional(),
  acknowledgeDangling: z.boolean().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; versionId: string }> },
): Promise<NextResponse> {
  const { user, error } = await requirePermission('subpages', 'update');
  if (error) return error;

  try {
    const { id: subpageId, versionId } = await params;

    const body = await request.json().catch(() => ({}));
    const parsed = rollbackSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0].message,
        } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    const { expectedRevision, statusStrategy } = parsed.data;

    const result = await restoreSubpageFromVersion({
      subpageId,
      versionId,
      actorId: user!.id,
      expectedRevision,
      statusStrategy,
    });

    // 블록 재구성 후 PGroonga 검색 인덱스 재집계
    await recalculateSubpageContent(subpageId);

    // 감사 로그 — 주체는 SUBPAGE(롤백 대상)
    const restored = await prisma.subpage.findUnique({
      where: { id: subpageId },
      select: { title: true },
    });

    const auditContext = getAuditContext(request);
    logAuditEvent({
      action: 'UPDATE',
      entityType: 'SUBPAGE',
      entityId: subpageId,
      entityTitle: `${restored?.title ?? '(알 수 없음)'} — 버전 롤백`,
      changes: {
        after: {
          rolledBackFromVersionId: versionId,
          preRollbackVersionId: result.preRollbackVersionId,
          statusStrategy: statusStrategy ?? 'KEEP_CURRENT',
          newRevision: result.newRevision,
        },
      },
      userId: user!.id,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          preRollbackVersionId: result.preRollbackVersionId,
          newRevision: result.newRevision,
        },
      } satisfies ApiResponse<{
        preRollbackVersionId: string;
        newRevision: number;
      }>,
    );
  } catch (err) {
    if (err instanceof RevisionMismatchError) {
      return NextResponse.json(
        {
          success: false,
          error:
            '다른 관리자가 먼저 수정했습니다. 새로고침 후 다시 시도해주세요.',
          code: 'REVISION_MISMATCH',
        } satisfies ApiResponse<never>,
        { status: 409 },
      );
    }
    if (err instanceof SubpageVersionNotFoundError) {
      return NextResponse.json(
        {
          success: false,
          error: '버전을 찾을 수 없습니다.',
        } satisfies ApiResponse<never>,
        { status: 404 },
      );
    }
    if (err instanceof SubpageVersionSlugConflictError) {
      return NextResponse.json(
        {
          success: false,
          error: `복원할 slug '${err.conflictingSlug}'가 이미 다른 서브페이지에서 사용 중입니다. 먼저 slug 충돌을 해결해주세요.`,
          code: 'VERSION_SLUG_CONFLICT',
        } satisfies ApiResponse<never>,
        { status: 409 },
      );
    }
    console.error('[SubpageVersion rollback POST] Unexpected error:', err);
    return NextResponse.json(
      {
        success: false,
        error: '버전 복원에 실패했습니다.',
      } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
