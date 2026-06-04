import { NextResponse } from 'next/server';
import { z } from 'zod';

import { logWebError } from '@simple-cms/db';
import type { LogWebErrorInput, Prisma } from '@simple-cms/db';

import { runWithRequestDemoSession } from '@/shared/lib/requestDemoSession';

export const runtime = 'nodejs';

const clientErrorReportSchema = z.object({
  level: z.enum(['ERROR', 'WARN']),
  source: z.enum([
    'SERVER_SSR',
    'SERVER_API',
    'SERVER_MIDDLEWARE',
    'CLIENT_REACT',
    'CLIENT_JS',
  ]),
  message: z.string().min(1).max(2000),
  stack: z.string().max(20000).optional(),
  url: z.string().max(2000).optional(),
  userAgent: z.string().max(500).optional(),
  referer: z.string().max(2000).optional(),
  digest: z.string().max(100).optional(),
  statusCode: z.number().int().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const METADATA_SIZE_LIMIT = 10_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;
const CLEANUP_INTERVAL = 50;

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();
let requestCounter = 0;

function cleanupRateLimit(now: number) {
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(ip);
  }
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  requestCounter += 1;
  if (requestCounter % CLEANUP_INTERVAL === 0) cleanupRateLimit(now);

  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}

export async function POST(request: Request): Promise<NextResponse> {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { success: false, error: 'Too many requests' },
      { status: 429 },
    );
  }

  try {
    const body = await request.json();
    const parsed = clientErrorReportSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid payload' },
        { status: 400 },
      );
    }

    // metadata 크기 제한 (DoS 방지)
    const metadata = parsed.data.metadata;
    if (
      metadata &&
      JSON.stringify(metadata).length > METADATA_SIZE_LIMIT
    ) {
      return NextResponse.json(
        { success: false, error: 'Metadata too large' },
        { status: 400 },
      );
    }

    const input: LogWebErrorInput = {
      level: parsed.data.level,
      source: parsed.data.source,
      message: parsed.data.message,
      stack: parsed.data.stack ?? null,
      url: parsed.data.url ?? null,
      method: 'POST',
      statusCode: parsed.data.statusCode ?? null,
      userAgent:
        parsed.data.userAgent ?? request.headers.get('user-agent') ?? null,
      ipAddress: ip,
      referer:
        parsed.data.referer ?? request.headers.get('referer') ?? null,
      digest: parsed.data.digest ?? null,
      metadata: metadata
        ? (metadata as unknown as Prisma.InputJsonValue)
        : null,
    };

    if (process.env.DEMO_MODE === 'true') {
      await runWithRequestDemoSession(request, async (session) => {
        if (!session) return;
        // logWebError는 내부 try-catch로 실패를 흡수함
        await logWebError(input);
      });
    } else {
      void logWebError(input);
    }

    return NextResponse.json({ success: true, data: null });
  } catch (err) {
    console.error('[ErrorReport API] Unexpected error:', err);
    // 내부 에러도 비노출: 공개 엔드포인트이므로 성공 응답을 반환
    return NextResponse.json({ success: true, data: null });
  }
}
