import { NextResponse } from 'next/server';

import { prisma } from '@simple-cms/db';
import type { ApiResponse } from '@simple-cms/types';

import { hasPermission } from '@/entities/auth/lib/checkPermission';
import { withAnyPermissionRoute } from '@/shared/api/withAdminRouteScope';

export type QuickSearchType = 'subpage' | 'post' | 'board' | 'menu';

export interface QuickSearchResult {
  type: QuickSearchType;
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

interface QuickSearchResponse {
  results: QuickSearchResult[];
}

const ALL_TYPES: QuickSearchType[] = ['subpage', 'post', 'board', 'menu'];
const DEFAULT_LIMIT = 8;

const QUICK_SEARCH_PERMISSION_CHECKS = [
  { resource: 'subpages', action: 'read' },
  { resource: 'posts', action: 'read' },
  { resource: 'boards', action: 'read' },
  { resource: 'navigation', action: 'read' },
] as const;

export const GET = withAnyPermissionRoute(
  QUICK_SEARCH_PERMISSION_CHECKS,
  async (request, ctx) => {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') ?? '').trim();
    if (!q) {
      return NextResponse.json({
        success: true,
        data: { results: [] },
      } satisfies ApiResponse<QuickSearchResponse>);
    }

    const requestedTypes = searchParams.get('types')?.split(',') ?? ALL_TYPES;
    const types = requestedTypes.filter((t): t is QuickSearchType =>
      (ALL_TYPES as string[]).includes(t),
    );

    const limit = Math.min(
      Number(searchParams.get('limit') ?? DEFAULT_LIMIT) || DEFAULT_LIMIT,
      20,
    );

    try {
      const tasks: Array<Promise<QuickSearchResult[]>> = [];

      if (
        types.includes('subpage') &&
        hasPermission(ctx.user, 'subpages', 'read')
      ) {
        tasks.push(
          prisma.subpage
            .findMany({
              where: {
                OR: [
                  { title: { contains: q, mode: 'insensitive' } },
                  { slug: { contains: q, mode: 'insensitive' } },
                ],
              },
              select: { id: true, title: true, slug: true, status: true },
              take: limit,
              orderBy: { updatedAt: 'desc' },
            })
            .then((items) =>
              items.map(
                (s): QuickSearchResult => ({
                  type: 'subpage',
                  id: s.id,
                  title: s.title,
                  subtitle: `/${s.slug} · ${s.status === 'PUBLISHED' ? '발행' : '초안'}`,
                  href: `/subpages/${s.id}`,
                }),
              ),
            ),
        );
      }

      if (types.includes('post') && hasPermission(ctx.user, 'posts', 'read')) {
        tasks.push(
          prisma.post
            .findMany({
              where: {
                OR: [
                  { title: { contains: q, mode: 'insensitive' } },
                  { slug: { contains: q, mode: 'insensitive' } },
                ],
              },
              include: { board: { select: { name: true } } },
              take: limit,
              orderBy: { updatedAt: 'desc' },
            })
            .then((items) =>
              items.map(
                (p): QuickSearchResult => ({
                  type: 'post',
                  id: p.id,
                  title: p.title,
                  subtitle: `${p.board.name} · ${p.status === 'PUBLISHED' ? '발행' : '초안'}`,
                  href: `/posts/${p.id}`,
                }),
              ),
            ),
        );
      }

      if (
        types.includes('board') &&
        hasPermission(ctx.user, 'boards', 'read')
      ) {
        tasks.push(
          prisma.board
            .findMany({
              where: {
                OR: [
                  { name: { contains: q, mode: 'insensitive' } },
                  { slug: { contains: q, mode: 'insensitive' } },
                ],
              },
              select: { id: true, name: true, slug: true, isPublic: true },
              take: limit,
              orderBy: { updatedAt: 'desc' },
            })
            .then((items) =>
              items.map(
                (b): QuickSearchResult => ({
                  type: 'board',
                  id: b.id,
                  title: b.name,
                  subtitle: `/${b.slug} · ${b.isPublic ? '공개' : '비공개'}`,
                  href: `/boards/${b.id}`,
                }),
              ),
            ),
        );
      }

      if (
        types.includes('menu') &&
        hasPermission(ctx.user, 'navigation', 'read')
      ) {
        tasks.push(
          prisma.navigationMenuItem
            .findMany({
              where: { label: { contains: q, mode: 'insensitive' } },
              include: {
                menu: { select: { id: true, name: true, slots: true } },
              },
              take: limit,
              orderBy: { updatedAt: 'desc' },
            })
            .then((items) =>
              items.map((m): QuickSearchResult => {
                const href = m.menu.slots.includes('HEADER')
                  ? `/site-layout/header/menu/${m.menuId}`
                  : m.menu.slots.includes('FOOTER')
                    ? `/site-layout/footer/menu/${m.menuId}`
                    : `/navigation/${m.menuId}`;

                return {
                  type: 'menu',
                  id: m.id,
                  title: m.label,
                  subtitle: m.menu.name,
                  href,
                };
              }),
            ),
        );
      }

      const groups = await Promise.all(tasks);
      const results = groups.flat();

      return NextResponse.json({
        success: true,
        data: { results },
      } satisfies ApiResponse<QuickSearchResponse>);
    } catch (err) {
      console.error('[Quick Search GET] Unexpected error:', err);
      const message =
        err instanceof Error ? err.message : '검색에 실패했습니다.';
      return NextResponse.json(
        { success: false, error: message } satisfies ApiResponse<never>,
        { status: 500 },
      );
    }
  },
);
