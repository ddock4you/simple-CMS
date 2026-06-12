import { Suspense } from 'react';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { prisma } from '@simple-cms/db';

import { requireAuth } from '@/entities/auth/lib/getCurrentUser';
import {
  subpageFeedbackListOptions,
  subpageFeedbackStatsOptions,
} from '@/features/subpage-feedback/api/feedbackQueries';
import type { FeedbackListQuery } from '@/features/subpage-feedback/model/feedbackFilters';
import { FeedbackExport } from '@/features/subpage-feedback/ui/FeedbackExport';
import { FeedbackFilters } from '@/features/subpage-feedback/ui/FeedbackFilters';
import { FeedbackListTable } from '@/features/subpage-feedback/ui/FeedbackListTable';
import { FeedbackStatsSection } from '@/features/subpage-feedback/ui/FeedbackStatsSection';
import { getQueryClient } from '@/shared/api/queryClient';
import { runWithUserDemoSession } from '@/entities/auth/lib/runWithUserDemoSession';
import { PageHeader } from '@/shared/ui/PageHeader';
import { PageToolbar } from '@/shared/ui/PageToolbar';

type RatingFilter = 'ALL' | 'POSITIVE' | 'NEGATIVE';

interface PageFilters {
  list: FeedbackListQuery;
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
  const page = Number(searchParams.page) || 1;
  const pageSize = Number(searchParams.pageSize) || 20;

  return {
    list: { subpageId, rating, from, to, q, page, pageSize },
    search: q ?? null,
  };
}

export default async function SubpageFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAuth();
  const params = await searchParams;
  const filters = parseFilters(params);

  const queryClient = getQueryClient();
  await Promise.all([
    queryClient.prefetchQuery(subpageFeedbackListOptions(filters.list)),
    queryClient.prefetchQuery(
      subpageFeedbackStatsOptions({
        from: filters.list.from,
        to: filters.list.to,
      }),
    ),
  ]);

  const subpageOptions = await runWithUserDemoSession(user, () =>
    prisma.subpage.findMany({
      select: { id: true, title: true, slug: true },
      orderBy: { title: 'asc' },
    }),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="사용자 피드백"
        description="공개 웹 서브페이지에서 수집된 만족도 조사를 분석하고 관리합니다."
      />
      <PageToolbar
        left={
          <Suspense>
            <FeedbackFilters
              currentRating={filters.list.rating}
              currentSubpageId={filters.list.subpageId ?? null}
              currentFrom={filters.list.from ?? null}
              currentTo={filters.list.to ?? null}
              currentQ={filters.search}
              subpageOptions={subpageOptions}
            />
          </Suspense>
        }
        right={
          <FeedbackExport
            from={filters.list.from ?? null}
            to={filters.list.to ?? null}
            rating={filters.list.rating}
            subpageId={filters.list.subpageId ?? null}
            q={filters.search}
          />
        }
        mobileLeftLabel="필터"
        mobileRightLabel="내보내기"
        mobileCollapseRight={false}
      />

      <HydrationBoundary state={dehydrate(queryClient)}>
        <FeedbackStatsSection
          from={filters.list.from ?? null}
          to={filters.list.to ?? null}
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
