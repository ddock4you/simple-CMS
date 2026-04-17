import { randomUUID } from 'node:crypto';

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@simple-cms/db';
import type {
  ApiResponse,
  PreviewTokenResponse,
} from '@simple-cms/types';

import { requirePermission } from '@/entities/auth/lib/requirePermission';
import { getWebBaseUrl } from '@/shared/lib/siteUrl';

const issueTokenSchema = z.object({
  entityType: z.enum(['SUBPAGE', 'POST']),
  entityId: z.string().min(1, 'entityId가 필요합니다.'),
});

const TTL_MS = 10 * 60 * 1000;

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: '요청 본문이 올바르지 않습니다.' } satisfies ApiResponse<never>,
      { status: 400 },
    );
  }

  const parsed = issueTokenSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0].message } satisfies ApiResponse<never>,
      { status: 400 },
    );
  }

  const { entityType, entityId } = parsed.data;

  const resource = entityType === 'SUBPAGE' ? 'subpages' : 'posts';
  const { user, error } = await requirePermission(resource, 'read');
  if (error) return error;

  try {
    if (entityType === 'SUBPAGE') {
      const exists = await prisma.subpage.findUnique({
        where: { id: entityId },
        select: { id: true },
      });
      if (!exists) {
        return NextResponse.json(
          { success: false, error: '서브 페이지를 찾을 수 없습니다.' } satisfies ApiResponse<never>,
          { status: 404 },
        );
      }
    } else {
      const exists = await prisma.post.findUnique({
        where: { id: entityId },
        select: { id: true },
      });
      if (!exists) {
        return NextResponse.json(
          { success: false, error: '게시글을 찾을 수 없습니다.' } satisfies ApiResponse<never>,
          { status: 404 },
        );
      }
    }

    const token = randomUUID();
    const expires = new Date(Date.now() + TTL_MS);

    await prisma.previewToken.create({
      data: {
        token,
        entityType,
        entityId,
        issuedById: user!.id,
        expires,
      },
    });

    const params = new URLSearchParams({
      token,
      type: entityType.toLowerCase(),
      id: entityId,
    });
    const webPreviewUrl = `${getWebBaseUrl()}/api/preview?${params.toString()}`;

    // 감사 로그 생략 — read-only preview token issuance
    return NextResponse.json(
      {
        success: true,
        data: {
          token,
          webPreviewUrl,
          expiresAt: expires.toISOString(),
        },
      } satisfies ApiResponse<PreviewTokenResponse>,
    );
  } catch (err) {
    console.error('[Preview Token POST] Unexpected error:', err);
    const message =
      err instanceof Error ? err.message : '미리보기 토큰 발급에 실패했습니다.';
    return NextResponse.json(
      { success: false, error: message } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
