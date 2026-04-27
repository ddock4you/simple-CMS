'use client';

import { useQuery } from '@tanstack/react-query';

import { subpageFeedbackStatsOptions } from '../api/feedbackQueries';

import { FeedbackBySubpageTable } from './FeedbackBySubpageTable';
import { FeedbackPositiveReasonsChart } from './FeedbackPositiveReasonsChart';
import { FeedbackStatsCards } from './FeedbackStatsCards';
import { FeedbackTimelineChart } from './FeedbackTimelineChart';

interface FeedbackStatsSectionProps {
  period: number;
  selectedSubpageId: string | null;
}

export function FeedbackStatsSection({
  period,
  selectedSubpageId,
}: FeedbackStatsSectionProps) {
  const { data } = useQuery(subpageFeedbackStatsOptions(period));

  if (!data) return null;

  return (
    <div className="space-y-4">
      <FeedbackStatsCards overall={data.overall} periodDays={data.periodDays} />
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
