import { NextResponse } from 'next/server';

import type { Action, ApiResponse, ResourceKey } from '@simple-cms/types';

import { getCurrentUser } from '@/entities/auth/lib/getCurrentUser';
import { requireAnyPermission } from '@/entities/auth/lib/requireAnyPermission';
import type { PermissionCheck } from '@/entities/auth/lib/requireAnyPermission';
import { requirePermission } from '@/entities/auth/lib/requirePermission';
import type { SessionUser } from '@/entities/auth/model/auth.types';
import { runWithUserDemoSession } from '@/entities/auth/lib/runWithUserDemoSession';
import { getAuditContext } from '@/shared/lib/auditHelpers';

export interface AdminRouteScopeContext {
  user: SessionUser;
  request: Request;
  params: Record<string, string>;
  auditCtx: { ipAddress: string | null; userAgent: string | null };
}

type RouteContext = { params?: Promise<Record<string, string>> };
type ScopedRouteHandler = (
  request: Request,
  ctx: AdminRouteScopeContext,
) => Promise<NextResponse>;

async function createContext(
  request: Request,
  routeCtx: RouteContext | undefined,
  user: SessionUser,
): Promise<AdminRouteScopeContext> {
  return {
    user,
    request,
    params: routeCtx?.params ? await routeCtx.params : {},
    auditCtx: getAuditContext(request),
  };
}

export function withAdminRouteScope(
  handler: ScopedRouteHandler,
): (request: Request, routeCtx?: RouteContext) => Promise<NextResponse> {
  return async function scopedRouteHandler(request, routeCtx) {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: '인증이 필요합니다.',
        } satisfies ApiResponse<never>,
        { status: 401 },
      );
    }

    return runWithUserDemoSession(user, async () =>
      handler(request, await createContext(request, routeCtx, user)),
    );
  };
}

export function withPermissionRoute(
  resource: ResourceKey,
  action: Action,
  handler: ScopedRouteHandler,
): (request: Request, routeCtx?: RouteContext) => Promise<NextResponse> {
  return async function permissionRouteHandler(request, routeCtx) {
    const { user, error } = await requirePermission(resource, action);
    if (error) return error;

    return runWithUserDemoSession(user, async () =>
      handler(request, await createContext(request, routeCtx, user)),
    );
  };
}

export function withAnyPermissionRoute(
  checks: ReadonlyArray<PermissionCheck>,
  handler: ScopedRouteHandler,
): (request: Request, routeCtx?: RouteContext) => Promise<NextResponse> {
  return async function anyPermissionRouteHandler(request, routeCtx) {
    const { user, error } = await requireAnyPermission(checks);
    if (error) return error;

    return runWithUserDemoSession(user, async () =>
      handler(request, await createContext(request, routeCtx, user)),
    );
  };
}
