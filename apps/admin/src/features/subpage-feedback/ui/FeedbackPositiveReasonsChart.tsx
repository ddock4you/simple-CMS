'use client';

import { useMemo } from 'react';
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
import { getChartColors } from '@/shared/lib/chartColors';

interface FeedbackPositiveReasonsChartProps {
  reasons: FeedbackPositiveReasonStat[];
}

export function FeedbackPositiveReasonsChart({
  reasons,
}: FeedbackPositiveReasonsChartProps) {
  const colors = useMemo(() => getChartColors(), []);
  const data = reasons.map((r) => ({
    label: FEEDBACK_POSITIVE_REASONS[r.code],
    count: r.count,
    code: r.code,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>긍정 이유 TOP</CardTitle>
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
                <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                <XAxis
                  type="number"
                  fontSize={12}
                  tick={{ fill: colors.muted }}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  fontSize={12}
                  tick={{ fill: colors.muted }}
                  width={140}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 6,
                    border: `1px solid ${colors.border}`,
                  }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {data.map((entry, index) => (
                    <Cell
                      key={entry.code}
                      fill={colors.palette[index % colors.palette.length]}
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
