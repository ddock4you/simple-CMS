import { NextResponse } from 'next/server';

import { logAuditEvent } from '@simple-cms/db';
import type { Action, ResourceKey } from '@simple-cms/types';
import type { ZodType, ZodTypeDef } from 'zod';

import { requirePermission } from '@/entities/auth/lib/requirePermission';
import type { SessionUser } from '@/entities/auth/model/auth.types';
import { getAuditContext } from '@/shared/lib/auditHelpers';
import { runWithUserDemoSession } from '@/shared/api/runWithUserDemoSession';

type AuditEventPayload = Omit<Parameters<typeof logAuditEvent>[0], 'userId' | 'ipAddress' | 'userAgent'>;

export interface HandlerContext<TParsed> {
  user: SessionUser;
  request: Request;
  parsed: TParsed;
  params: Record<string, string>;
  auditCtx: { ipAddress: string | null; userAgent: string | null };
}

interface DefineRouteOptions<TParsed, TResult> {
  resource: ResourceKey;
  action: Action;
  /** Body schema — if provided, defineRoute parses request.json() and returns 400 on failure. */
  schema?: ZodType<TParsed, ZodTypeDef, unknown>;
  handler: (ctx: HandlerContext<TParsed>) => Promise<TResult | NextResponse>;
  /** Transform handler result before JSON wrapping. Defaults to identity (returns result as-is). */
  responseData?: (result: TResult) => unknown;
  audit?: {
    /**
     * Return one or more audit payloads from the handler result.
     * Return null to skip audit for this invocation (e.g. no-op paths).
     * Array return emits multiple audit events (e.g. rollback: SUBPAGE + SUBPAGE_VERSION).
     */
    build: (
      result: TResult,
      ctx: HandlerContext<TParsed>,
    ) => AuditEventPayload | AuditEventPayload[] | null;
  };
}

function isPrismaRecordNotFoundError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: unknown }).code === 'P2025'
  );
}

function isPrismaUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: unknown }).code === 'P2002'
  );
}

export function defineRoute<TParsed = undefined, TResult = null>(
  opts: DefineRouteOptions<TParsed, TResult>,
): (request: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<NextResponse> {
  return async function routeHandler(
    request: Request,
    routeCtx: { params: Promise<Record<string, string>> },
  ): Promise<NextResponse> {
    const { user, error } = await requirePermission(opts.resource, opts.action);
    if (error) return error;

    return runWithUserDemoSession(user, async () => {
      try {
        let parsed = undefined as TParsed;

        if (opts.schema) {
          let body: unknown;
          try {
            body = await request.json();
          } catch {
            return NextResponse.json(
              { success: false, error: '잘못된 요청입니다.' },
              { status: 400 },
            );
          }

          const result = opts.schema.safeParse(body);
          if (!result.success) {
            return NextResponse.json(
              { success: false, error: result.error.issues[0]?.message ?? '잘못된 요청입니다.' },
              { status: 400 },
            );
          }
          parsed = result.data;
        }

        const params = await routeCtx.params;
        const auditCtx = getAuditContext(request);
        const ctx: HandlerContext<TParsed> = { user, request, parsed, params, auditCtx };

        const result = await opts.handler(ctx);

        // Escape hatch: handler returns NextResponse directly (404, 409, 201, no-op, etc.)
        if (result instanceof NextResponse) {
          return result;
        }

        if (opts.audit) {
          const payloads = opts.audit.build(result, ctx);
          if (payloads !== null) {
            const list = Array.isArray(payloads) ? payloads : [payloads];
            for (const payload of list) {
              void logAuditEvent({
                ...payload,
                userId: user.id,
                ipAddress: auditCtx.ipAddress,
                userAgent: auditCtx.userAgent,
              });
            }
          }
        }

        const responsePayload = opts.responseData ? opts.responseData(result) : result;
        return NextResponse.json({ success: true, data: responsePayload });
      } catch (err) {
        if (isPrismaRecordNotFoundError(err)) {
          return NextResponse.json(
            { success: false, error: '대상을 찾을 수 없습니다.' },
            { status: 404 },
          );
        }
        if (isPrismaUniqueConstraintError(err)) {
          return NextResponse.json(
            { success: false, error: '이미 사용 중인 값입니다.' },
            { status: 409 },
          );
        }
        console.error(`[${opts.resource} ${opts.action}] Unexpected error:`, err);
        return NextResponse.json(
          { success: false, error: '요청 처리에 실패했습니다.' },
          { status: 500 },
        );
      }
    });
  };
}
