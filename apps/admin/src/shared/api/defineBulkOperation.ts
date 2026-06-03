import { NextResponse } from 'next/server';

import type { Action, ResourceKey } from '@simple-cms/types';
import type { ZodType } from 'zod';

import { requirePermission } from '@/entities/auth/lib/requirePermission';
import { getAuditContext } from '@/shared/lib/auditHelpers';
import { runWithUserDemoSession } from '@/shared/api/runWithUserDemoSession';
import type { HandlerContext } from './defineRoute';

interface DefineBulkOperationOptions<TParsed extends { ids: string[] }, TFail> {
  resource: ResourceKey;
  action: Action;
  inputSchema: ZodType<TParsed>;
  /**
   * Process a single item. Return 'skip' for items not found or already in target state.
   * ID deduplication is not performed — duplicate IDs hit processItem twice, but the second
   * call will typically resolve to { kind: 'skip' } via findFirst → null path.
   */
  processItem: (
    id: string,
    ctx: HandlerContext<TParsed>,
  ) => Promise<{ kind: 'success' } | { kind: 'fail'; data: TFail } | { kind: 'skip' }>;
  successKey: string;
  failKey: string;
  /** Called once after all items are processed, only when at least one succeeded. */
  afterAll?: (successIds: string[], ctx: HandlerContext<TParsed>) => Promise<void>;
}

export function defineBulkOperation<TParsed extends { ids: string[] }, TFail>(
  opts: DefineBulkOperationOptions<TParsed, TFail>,
): (request: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<NextResponse> {
  return async function bulkOperationHandler(
    request: Request,
    routeCtx: { params: Promise<Record<string, string>> },
  ): Promise<NextResponse> {
    const { user, error } = await requirePermission(opts.resource, opts.action);
    if (error) return error;

    return runWithUserDemoSession(user, async () => {
      try {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return NextResponse.json(
            { success: false, error: '잘못된 요청입니다.' },
            { status: 400 },
          );
        }

        const result = opts.inputSchema.safeParse(body);
        if (!result.success) {
          return NextResponse.json(
            { success: false, error: result.error.issues[0]?.message ?? '잘못된 요청입니다.' },
            { status: 400 },
          );
        }

        const parsed = result.data;
        const params = await routeCtx.params;
        const auditCtx = getAuditContext(request);
        const ctx: HandlerContext<TParsed> = { user, request, parsed, params, auditCtx };

        const successIds: string[] = [];
        const failItems: TFail[] = [];

        for (const id of parsed.ids) {
          const itemResult = await opts.processItem(id, ctx);
          if (itemResult.kind === 'success') {
            successIds.push(id);
          } else if (itemResult.kind === 'fail') {
            failItems.push(itemResult.data);
          }
          // 'skip' is silently ignored
        }

        if (opts.afterAll && successIds.length > 0) {
          await opts.afterAll(successIds, ctx);
        }

        return NextResponse.json({
          success: true,
          data: {
            [opts.successKey]: successIds,
            [opts.failKey]: failItems,
          },
        });
      } catch (err) {
        console.error(`[${opts.resource} ${opts.action}] Unexpected error:`, err);
        return NextResponse.json(
          { success: false, error: '요청 처리에 실패했습니다.' },
          { status: 500 },
        );
      }
    });
  };
}
