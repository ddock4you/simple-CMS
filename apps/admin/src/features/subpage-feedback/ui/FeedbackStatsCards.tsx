import { MessageSquare, ThumbsUp, ThumbsDown, Percent } from 'lucide-react';

import type { FeedbackOverallStats } from '@simple-cms/types';

import { StatCard } from '@/shared/ui/layout/StatCard';

interface FeedbackStatsCardsProps {
  overall: FeedbackOverallStats;
  periodDays: number;
  hasExplicitRange?: boolean;
}

export function FeedbackStatsCards({
  overall,
  periodDays,
  hasExplicitRange = false,
}: FeedbackStatsCardsProps) {
  const positiveRatePercent = Math.round(overall.positiveRate * 100);
  const avgPerDay = Math.round(overall.avgPerDay * 10) / 10;
  const totalTitle = hasExplicitRange
    ? `선택 기간 피드백 (${periodDays}일)`
    : `최근 ${periodDays}일 피드백`;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title={totalTitle}
        value={overall.total}
        description={`일평균 ${avgPerDay}건`}
        icon={MessageSquare}
      />
      <StatCard
        title="긍정 (네)"
        value={overall.positive}
        description={`${positiveRatePercent}%`}
        icon={ThumbsUp}
      />
      <StatCard
        title="부정 (아니오)"
        value={overall.negative}
        description={`${100 - positiveRatePercent}%`}
        icon={ThumbsDown}
      />
      <StatCard
        title="만족도"
        value={positiveRatePercent}
        description="긍정 비율 (%)"
        icon={Percent}
      />
    </div>
  );
}
