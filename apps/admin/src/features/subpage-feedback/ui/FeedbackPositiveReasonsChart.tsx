'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import {
  FEEDBACK_POSITIVE_REASONS,
  type FeedbackPositiveReasonStat,
} from '@simple-cms/types';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';

interface FeedbackPositiveReasonsChartProps {
  reasons: FeedbackPositiveReasonStat[];
}

const BAR_COLORS = ['#2563eb', '#16a34a', '#f59e0b'];

export function FeedbackPositiveReasonsChart({
  reasons,
}: FeedbackPositiveReasonsChartProps) {
  const data = reasons.map((r) => ({
    label: FEEDBACK_POSITIVE_REASONS[r.code],
    count: r.count,
    code: r.code,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">긍정 이유 TOP</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 8, right: 24, left: 16, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  type="number"
                  fontSize={12}
                  tick={{ fill: '#6b7280' }}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  fontSize={12}
                  tick={{ fill: '#6b7280' }}
                  width={140}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 6,
                    border: '1px solid #e5e7eb',
                  }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {data.map((entry, index) => (
                    <Cell
                      key={entry.code}
                      fill={BAR_COLORS[index % BAR_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
            긍정 피드백이 없습니다.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
