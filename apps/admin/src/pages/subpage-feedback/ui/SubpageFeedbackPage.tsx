import { Suspense } from 'react';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { prisma } from '@simple-cms/db';

import { requireAuth } from '@/entities/auth/lib/getCurrentUser';
import {
  subpageFeedbackListOptions,
  subpageFeedbackStatsOptions,
} from '@/features/subpage-feedback/api/feedbackQueries';
import type { FeedbackListQuery } from '@/features/subpage-feedback/model/feedbackFilters';
import { FeedbackFilters } from '@/features/subpage-feedback/ui/FeedbackFilters';
import { FeedbackListTable } from '@/features/subpage-feedback/ui/FeedbackListTable';
import { FeedbackStatsSection } from '@/features/subpage-feedback/ui/FeedbackStatsSection';
import { getQueryClient } from '@/shared/api/queryClient';

type RatingFilter = 'ALL' | 'POSITIVE' | 'NEGATIVE';

interface PageFilters {
  list: FeedbackListQuery;
  period: number;
  search: string | null;
}

function parseFilters(
  searchParams: Record<string, string | string[] | undefined>,
): PageFilters {
  const subpageId = (searchParams.subpageId as string) || undefined;
  const ratingRaw = (searchParams.rating as string) || 'ALL';
  const rating: RatingFilter =
    ratingRaw === 'POSITIVE' || ratingRaw === 'NEGATIVE' ? ratingRaw : 'ALL';
  const from = (searchParams.from as string) || undefined;
  const to = (searchParams.to as string) || undefined;
  const q = (searchParams.q as string) || undefined;
  const period = Number(searchParams.period) || 30;
  const page = Number(searchParams.page) || 1;
  const pageSize = Number(searchParams.pageSize) || 20;

  return {
    list: { subpageId, rating, from, to, q, page, pageSize },
    period: Math.min(365, Math.max(1, period)),
    search: q ?? null,
  };
}

export default async function SubpageFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAuth();
  const params = await searchParams;
  const filters = parseFilters(params);

  const queryClient = getQueryClient();
  await Promise.all([
    queryClient.prefetchQuery(subpageFeedbackListOptions(filters.list)),
    queryClient.prefetchQuery(subpageFeedbackStatsOptions(filters.period)),
  ]);

  const subpageOptions = await prisma.subpage.findMany({
    select: { id: true, title: true, slug: true },
    orderBy: { title: 'asc' },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">사용자 피드백</h1>
          <p className="text-muted-foreground">
            공개 웹 서브페이지에서 수집된 만족도 조사를 분석하고 관리합니다.
          </p>
        </div>
      </div>

      <HydrationBoundary state={dehydrate(queryClient)}>
        <Suspense>
          <FeedbackFilters
            currentRating={filters.list.rating}
            currentSubpageId={filters.list.subpageId ?? null}
            currentFrom={filters.list.from ?? null}
            currentTo={filters.list.to ?? null}
            currentQ={filters.search}
            currentPeriod={filters.period}
            subpageOptions={subpageOptions}
          />
        </Suspense>

        <FeedbackStatsSection
          period={filters.period}
          selectedSubpageId={filters.list.subpageId ?? null}
        />

        <div>
          <h2 className="mb-3 text-lg font-semibold">피드백 목록</h2>
          <FeedbackListTable filters={filters.list} />
        </div>
      </HydrationBoundary>
    </div>
  );
}
