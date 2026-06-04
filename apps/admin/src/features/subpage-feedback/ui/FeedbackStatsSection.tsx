'use client';

import { useQuery } from '@tanstack/react-query';

import {
  getQueryErrorMessage,
  QueryStateMessage,
} from '@/shared/ui/QueryStateMessage';
import { subpageFeedbackStatsOptions } from '../api/feedbackQueries';

import { FeedbackBySubpageTable } from './FeedbackBySubpageTable';
import { FeedbackPositiveReasonsChart } from './FeedbackPositiveReasonsChart';
import { FeedbackStatsCards } from './FeedbackStatsCards';
import { FeedbackTimelineChart } from './FeedbackTimelineChart';

interface FeedbackStatsSectionProps {
  from: string | null;
  to: string | null;
  selectedSubpageId: string | null;
}

export function FeedbackStatsSection({
  from,
  to,
  selectedSubpageId,
}: FeedbackStatsSectionProps) {
  const { data, isPending, isError, error } = useQuery(
    subpageFeedbackStatsOptions({
      from: from ?? undefined,
      to: to ?? undefined,
    }),
  );
  const hasExplicitRange = Boolean(from || to);

  if (isPending) {
    return <QueryStateMessage title="피드백 통계를 불러오는 중..." />;
  }

  if (isError) {
    return (
      <QueryStateMessage
        title="피드백 통계를 불러오지 못했습니다."
        details={getQueryErrorMessage(error)}
        tone="destructive"
      />
    );
  }

  return (
    <div className="space-y-4">
      <FeedbackStatsCards
        overall={data.overall}
        periodDays={data.periodDays}
        hasExplicitRange={hasExplicitRange}
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <FeedbackTimelineChart daily={data.daily} />
        </div>
        <FeedbackPositiveReasonsChart reasons={data.topPositiveReasons} />
      </div>
      <FeedbackBySubpageTable
        items={data.bySubpage}
        selectedSubpageId={selectedSubpageId ?? undefined}
      />
    </div>
  );
}
