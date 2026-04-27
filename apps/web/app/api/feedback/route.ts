import { createHash } from 'node:crypto';

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@simple-cms/db';
import {
  FEEDBACK_COMMENT_MAX_LENGTH,
  FEEDBACK_POSITIVE_REASON_CODES,
  FEEDBACK_RATE_LIMIT_HOURS,
  type FeedbackPositiveReason,
} from '@simple-cms/types';

import { PREVIEW_COOKIE_NAME } from '@/shared/lib/previewCookies';

export const runtime = 'nodejs';

// 감사 로그 생략: 익명 사용자의 피드백 입수 이벤트 (관리 액션이 아님).
// 운영자가 피드백을 삭제할 때만 admin 측에서 SUBPAGE_FEEDBACK DELETE 감사 로그를 기록한다.

const POSITIVE_REASONS_SET = new Set<FeedbackPositiveReason>(
  FEEDBACK_POSITIVE_REASON_CODES,
);

const feedbackBodySchema = z.object({
  subpageId: z.string().min(1).max(40),
  rating: z.enum(['POSITIVE', 'NEGATIVE']),
  positiveReasons: z
    .array(z.string().max(64))
    .max(FEEDBACK_POSITIVE_REASON_CODES.length)
    .optional(),
  comment: z.string().max(FEEDBACK_COMMENT_MAX_LENGTH).optional(),
});

const RATE_LIMIT_MS = FEEDBACK_RATE_LIMIT_HOURS * 60 * 60 * 1000;

function extractIp(request: Request): string | null {
  const forwarded = request.headers
    .get('x-forwarded-for')
    ?.split(',')[0]
    ?.trim();
  if (forwarded) return forwarded;
  const real = request.headers.get('x-real-ip')?.trim();
  if (real) return real;
  return null;
}

function hashIp(ip: string): string {
  const salt = process.env.FEEDBACK_IP_SALT;
  if (!salt) {
    console.warn(
      '[Feedback API] FEEDBACK_IP_SALT is not set — using fallback (not safe for production).',
    );
  }
  return createHash('sha256')
    .update(`${ip}|${salt ?? 'change-me'}`)
    .digest('hex');
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();
    const parsed = feedbackBodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: '잘못된 요청입니다.' },
        { status: 400 },
      );
    }

    // 1. preview 세션이면 거부 — 운영자 미리보기에서 통계 오염 방지
    const previewCookie = request.headers
      .get('cookie')
      ?.split(';')
      .map((s) => s.trim())
      .find((c) => c.startsWith(`${PREVIEW_COOKIE_NAME}=`));
    if (previewCookie) {
      return NextResponse.json(
        {
          success: false,
          error: '미리보기 세션에서는 피드백을 제출할 수 없습니다.',
        },
        { status: 403 },
      );
    }

    const { subpageId, rating } = parsed.data;
    const comment = parsed.data.comment?.trim() || null;

    // 2. 서브페이지 존재 + PUBLISHED + feedbackEnabled
    const subpage = await prisma.subpage.findUnique({
      where: { id: subpageId },
      select: { id: true, status: true, feedbackEnabled: true },
    });
    if (!subpage) {
      return NextResponse.json(
        { success: false, error: '서브페이지를 찾을 수 없습니다.' },
        { status: 404 },
      );
    }
    if (subpage.status !== 'PUBLISHED' || !subpage.feedbackEnabled) {
      return NextResponse.json(
        {
          success: false,
          error: '이 서브페이지는 피드백 수집을 받지 않습니다.',
        },
        { status: 403 },
      );
    }

    // 3. 긍정 이유 화이트리스트 (POSITIVE일 때만 의미)
    const rawReasons = parsed.data.positiveReasons ?? [];
    const positiveReasons: FeedbackPositiveReason[] =
      rating === 'POSITIVE'
        ? Array.from(
            new Set(
              rawReasons.filter((r): r is FeedbackPositiveReason =>
                POSITIVE_REASONS_SET.has(r as FeedbackPositiveReason),
              ),
            ),
          )
        : [];

    // 4. IP 해싱 + rate limit (24h, ipHash + subpageId)
    const ip = extractIp(request);
    const ipHash = ip ? hashIp(ip) : null;
    const userAgent = request.headers.get('user-agent') ?? null;

    if (ipHash) {
      const since = new Date(Date.now() - RATE_LIMIT_MS);
      const existing = await prisma.subpageFeedback.findFirst({
        where: {
          ipAddressHash: ipHash,
          subpageId,
          createdAt: { gte: since },
        },
        select: { id: true },
      });
      if (existing) {
        return NextResponse.json(
          {
            success: false,
            error: '이미 이 페이지에 피드백을 제출하셨습니다.',
          },
          { status: 429 },
        );
      }
    }

    // 5. 저장
    await prisma.subpageFeedback.create({
      data: {
        subpageId,
        rating,
        positiveReasons,
        comment,
        ipAddressHash: ipHash,
        userAgent,
      },
    });

    return NextResponse.json({ success: true, data: null });
  } catch (err) {
    console.error('[Feedback API] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: '피드백 제출에 실패했습니다.' },
      { status: 500 },
    );
  }
}
