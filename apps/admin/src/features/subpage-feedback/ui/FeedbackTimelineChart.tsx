'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { FeedbackDailyPoint } from '@simple-cms/types';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import { getChartColors } from '@/shared/lib/chartColors';

interface FeedbackTimelineChartProps {
  daily: FeedbackDailyPoint[];
}

function formatDateLabel(date: string): string {
  const [, m, d] = date.split('-');
  return `${m}/${d}`;
}

export function FeedbackTimelineChart({ daily }: FeedbackTimelineChartProps) {
  const colors = useMemo(() => getChartColors(), []);
  const data = daily.map((d) => ({
    ...d,
    label: formatDateLabel(d.date),
  }));

  const hasData = daily.some((d) => d.positive > 0 || d.negative > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>일별 피드백 추이</CardTitle>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                <XAxis
                  dataKey="label"
                  fontSize={12}
                  tick={{ fill: colors.muted }}
                />
                <YAxis fontSize={12} tick={{ fill: colors.muted }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 6,
                    border: `1px solid ${colors.border}`,
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                  iconType="circle"
                />
                <Bar
                  dataKey="positive"
                  name="긍정"
                  stackId="rating"
                  fill={colors.positive}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="negative"
                  name="부정"
                  stackId="rating"
                  fill={colors.negative}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
            기간 내 피드백이 없습니다.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
