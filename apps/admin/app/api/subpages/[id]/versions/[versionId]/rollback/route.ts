import { NextResponse } from 'next/server';

import { z } from 'zod';

import {
  prisma,
  restoreSubpageFromVersion,
  RevisionMismatchError,
  SubpageVersionNotFoundError,
  SubpageVersionSlugConflictError,
} from '@simple-cms/db';

import { recalculateSubpageContent } from '@/shared/lib/blockContentRecalculation';
import { defineRoute } from '@/entities/auth/lib/defineRoute';

const rollbackSchema = z.object({
  expectedRevision: z.number().int().nonnegative(),
  statusStrategy: z.enum(['KEEP_CURRENT', 'APPLY_VERSION']).optional(),
  acknowledgeDangling: z.boolean().optional(),
});

type RollbackResult = {
  preRollbackVersionId: string;
  newRevision: number;
  restoredTitle: string;
};

export const POST = defineRoute<z.infer<typeof rollbackSchema>, RollbackResult>({
  resource: 'subpages',
  action: 'update',
  schema: rollbackSchema,
  responseData: (r) => ({
    preRollbackVersionId: r.preRollbackVersionId,
    newRevision: r.newRevision,
  }),
  handler: async ({ user, parsed, params }) => {
    const { id: subpageId, versionId } = params;
    const { expectedRevision, statusStrategy } = parsed;

    let result;
    try {
      result = await restoreSubpageFromVersion({
        subpageId,
        versionId,
        actorId: user.id,
        expectedRevision,
        statusStrategy,
      });
    } catch (err) {
      if (err instanceof RevisionMismatchError) {
        return NextResponse.json(
          {
            success: false,
            error: '다른 관리자가 먼저 수정했습니다. 새로고침 후 다시 시도해주세요.',
            code: 'REVISION_MISMATCH',
          },
          { status: 409 },
        );
      }
      if (err instanceof SubpageVersionNotFoundError) {
        return NextResponse.json(
          { success: false, error: '버전을 찾을 수 없습니다.' },
          { status: 404 },
        );
      }
      if (err instanceof SubpageVersionSlugConflictError) {
        return NextResponse.json(
          {
            success: false,
            error: `복원할 slug '${err.conflictingSlug}'가 이미 다른 서브페이지에서 사용 중입니다. 먼저 slug 충돌을 해결해주세요.`,
            code: 'VERSION_SLUG_CONFLICT',
          },
          { status: 409 },
        );
      }
      throw err;
    }

    await recalculateSubpageContent(subpageId);

    const restored = await prisma.subpage.findFirst({
      where: { id: subpageId },
      select: { title: true },
    });

    return {
      preRollbackVersionId: result.preRollbackVersionId,
      newRevision: result.newRevision,
      restoredTitle: restored?.title ?? '(알 수 없음)',
    };
  },
  audit: {
    build: (result, ctx) => ({
      action: 'UPDATE',
      entityType: 'SUBPAGE',
      entityId: ctx.params.id,
      entityTitle: `${result.restoredTitle} — 버전 롤백`,
      changes: {
        after: {
          rolledBackFromVersionId: ctx.params.versionId,
          preRollbackVersionId: result.preRollbackVersionId,
          statusStrategy: ctx.parsed.statusStrategy ?? 'KEEP_CURRENT',
          newRevision: result.newRevision,
        },
      },
    }),
  },
});
