import { NextResponse } from 'next/server';

import { prisma } from '@simple-cms/db';
import {
  FEEDBACK_POSITIVE_REASON_CODES,
  type ApiResponse,
  type FeedbackBySubpageItem,
  type FeedbackDailyPoint,
  type FeedbackPositiveReason,
  type FeedbackPositiveReasonStat,
  type FeedbackStatsResponse,
} from '@simple-cms/types';

import { requirePermission } from '@/entities/auth/lib/requirePermission';
import { feedbackStatsQuerySchema } from '@/features/subpage-feedback/model/feedbackFilters';

const DAY_MS = 24 * 60 * 60 * 1000;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DEFAULT_PERIOD_DAYS = 30;

function kstStartOfDay(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000+09:00`);
}

function kstEndOfDay(dateStr: string): Date {
  return new Date(`${dateStr}T23:59:59.999+09:00`);
}

function toKstDateKey(d: Date): string {
  return new Date(d.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

export async function GET(request: Request): Promise<NextResponse> {
  const { error } = await requirePermission('subpage-feedback', 'read');
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const parsed = feedbackStatsQuerySchema.safeParse({
      from: searchParams.get('from') ?? undefined,
      to: searchParams.get('to') ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message ?? '잘못된 요청입니다.',
        } satisfies ApiResponse<never>,
        { status: 400 },
      );
    }

    // from/to가 없으면 최근 30일을 기본으로 적용 (KST 자정 정렬)
    const todayKstKey = toKstDateKey(new Date());
    const fallbackFromDate = new Date(
      kstStartOfDay(todayKstKey).getTime() -
        (DEFAULT_PERIOD_DAYS - 1) * DAY_MS,
    );
    const fallbackFromKey = toKstDateKey(fallbackFromDate);

    const fromKey = parsed.data.from ?? fallbackFromKey;
    const toKey = parsed.data.to ?? todayKstKey;

    const since = kstStartOfDay(fromKey);
    const until = kstEndOfDay(toKey);
    // T23:59:59.999 종료라 (until - since) / DAY_MS는 N - 1ms/day → round 시 정확한 inclusive day count.
    const period = Math.max(
      1,
      Math.round((until.getTime() - since.getTime()) / DAY_MS),
    );

    const feedbacks = await prisma.subpageFeedback.findMany({
      where: { createdAt: { gte: since, lte: until } },
      select: {
        subpageId: true,
        rating: true,
        positiveReasons: true,
        createdAt: true,
        subpage: { select: { title: true, slug: true } },
      },
    });

    const total = feedbacks.length;
    const positive = feedbacks.filter((f) => f.rating === 'POSITIVE').length;
    const negative = total - positive;
    const positiveRate = total === 0 ? 0 : positive / total;
    const avgPerDay = period === 0 ? 0 : total / period;

    // 일별 집계 (빈 날짜도 0으로 채워 차트가 매끄럽게, KST 자정 기준)
    const dailyMap = new Map<string, { positive: number; negative: number }>();
    for (const f of feedbacks) {
      const key = toKstDateKey(f.createdAt);
      const cur = dailyMap.get(key) ?? { positive: 0, negative: 0 };
      if (f.rating === 'POSITIVE') cur.positive += 1;
      else cur.negative += 1;
      dailyMap.set(key, cur);
    }
    const daily: FeedbackDailyPoint[] = [];
    for (let i = 0; i < period; i += 1) {
      const day = new Date(since.getTime() + i * DAY_MS);
      const key = toKstDateKey(day);
      const cur = dailyMap.get(key) ?? { positive: 0, negative: 0 };
      daily.push({ date: key, positive: cur.positive, negative: cur.negative });
    }

    // 서브페이지별 집계
    const subpageMap = new Map<
      string,
      {
        subpageTitle: string;
        subpageSlug: string;
        total: number;
        positive: number;
        negative: number;
      }
    >();
    for (const f of feedbacks) {
      const cur = subpageMap.get(f.subpageId) ?? {
        subpageTitle: f.subpage.title,
        subpageSlug: f.subpage.slug,
        total: 0,
        positive: 0,
        negative: 0,
      };
      cur.total += 1;
      if (f.rating === 'POSITIVE') cur.positive += 1;
      else cur.negative += 1;
      subpageMap.set(f.subpageId, cur);
    }
    const bySubpage: FeedbackBySubpageItem[] = Array.from(subpageMap.entries())
      .map(([subpageId, v]) => ({
        subpageId,
        subpageTitle: v.subpageTitle,
        subpageSlug: v.subpageSlug,
        total: v.total,
        positive: v.positive,
        negative: v.negative,
        positiveRate: v.total === 0 ? 0 : v.positive / v.total,
      }))
      .sort((a, b) => b.total - a.total);

    // 긍정 이유 TOP
    const validReasons = new Set<FeedbackPositiveReason>(
      FEEDBACK_POSITIVE_REASON_CODES,
    );
    const reasonMap = new Map<FeedbackPositiveReason, number>();
    for (const f of feedbacks) {
      if (f.rating !== 'POSITIVE') continue;
      for (const r of f.positiveReasons) {
        if (validReasons.has(r as FeedbackPositiveReason)) {
          const code = r as FeedbackPositiveReason;
          reasonMap.set(code, (reasonMap.get(code) ?? 0) + 1);
        }
      }
    }
    const topPositiveReasons: FeedbackPositiveReasonStat[] = Array.from(
      reasonMap.entries(),
    )
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count);

    const data: FeedbackStatsResponse = {
      periodDays: period,
      overall: { total, positive, negative, positiveRate, avgPerDay },
      daily,
      bySubpage,
      topPositiveReasons,
    };

    return NextResponse.json(
      { success: true, data } satisfies ApiResponse<FeedbackStatsResponse>,
    );
  } catch (err) {
    console.error('[SubpageFeedback Stats GET] Unexpected error:', err);
    return NextResponse.json(
      {
        success: false,
        error: '피드백 통계 조회에 실패했습니다.',
      } satisfies ApiResponse<never>,
      { status: 500 },
    );
  }
}
