'use client';

import { useQuery } from '@tanstack/react-query';

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
  const { data } = useQuery(
    subpageFeedbackStatsOptions({
      from: from ?? undefined,
      to: to ?? undefined,
    }),
  );
  const hasExplicitRange = Boolean(from || to);

  if (!data) return null;

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
