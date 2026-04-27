'use client';

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

interface FeedbackTimelineChartProps {
  daily: FeedbackDailyPoint[];
}

function formatDateLabel(date: string): string {
  const [, m, d] = date.split('-');
  return `${m}/${d}`;
}

export function FeedbackTimelineChart({ daily }: FeedbackTimelineChartProps) {
  const data = daily.map((d) => ({
    ...d,
    label: formatDateLabel(d.date),
  }));

  const hasData = daily.some((d) => d.positive > 0 || d.negative > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">일별 피드백 추이</CardTitle>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="label"
                  fontSize={12}
                  tick={{ fill: '#6b7280' }}
                />
                <YAxis fontSize={12} tick={{ fill: '#6b7280' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 6,
                    border: '1px solid #e5e7eb',
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
                  fill="#16a34a"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="negative"
                  name="부정"
                  stackId="rating"
                  fill="#dc2626"
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
